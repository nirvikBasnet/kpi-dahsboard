import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

interface PersonData {
  firstname: string;
  lastname: string;
  barcode_range_count: number;
  total_hours_worked: number;
  barcodes_per_hour: number;
  work_periods: Array<{
    start_time: string;
    end_time: string;
    duration_hours: number;
    barcode_count: number;
  }>;
}

interface AnalysisResult {
  success: boolean;
  data?: {
    people_data: PersonData[];
    statistics: {
      total_people: number;
      total_ranges: number;
      average_ranges_per_person: number;
    };
    filename: string;
    upload_time: string;
  };
  error?: string;
}

function parseTimeToMinutes(timeStr: string): number {
  // Parse time in format "HH:MM:SS.mmm" to minutes since midnight
  const [timePart] = timeStr.split('.');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  return hours * 60 + minutes + seconds / 60;
}

function calculateWorkPeriods(timeEntries: string[]): Array<{
  start_time: string;
  end_time: string;
  duration_hours: number;
  barcode_count: number;
}> {
  if (timeEntries.length === 0) return [];
  
  // Sort time entries
  const sortedTimes = timeEntries.sort();
  const periods: Array<{
    start_time: string;
    end_time: string;
    duration_hours: number;
    barcode_count: number;
  }> = [];
  
  let currentPeriod = {
    start_time: sortedTimes[0],
    end_time: sortedTimes[0],
    duration_hours: 0,
    barcode_count: 1
  };
  
  for (let i = 1; i < sortedTimes.length; i++) {
    const prevTime = parseTimeToMinutes(sortedTimes[i - 1]);
    const currentTime = parseTimeToMinutes(sortedTimes[i]);
    const timeDiff = currentTime - prevTime;
    
    // If gap is more than 30 minutes, start a new period
    if (timeDiff > 30) {
      // Calculate duration for previous period
      const startMinutes = parseTimeToMinutes(currentPeriod.start_time);
      const endMinutes = parseTimeToMinutes(currentPeriod.end_time);
      currentPeriod.duration_hours = (endMinutes - startMinutes) / 60;
      
      periods.push({ ...currentPeriod });
      
      // Start new period
      currentPeriod = {
        start_time: sortedTimes[i],
        end_time: sortedTimes[i],
        duration_hours: 0,
        barcode_count: 1
      };
    } else {
      // Continue current period
      currentPeriod.end_time = sortedTimes[i];
      currentPeriod.barcode_count++;
    }
  }
  
  // Add the last period
  const startMinutes = parseTimeToMinutes(currentPeriod.start_time);
  const endMinutes = parseTimeToMinutes(currentPeriod.end_time);
  currentPeriod.duration_hours = (endMinutes - startMinutes) / 60;
  periods.push(currentPeriod);
  
  return periods;
}

function detectEncoding(buffer: Buffer): BufferEncoding {
  // Check for UTF-16 BOM first
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf-16le';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf-16le'; // Node.js doesn't support utf-16be, use utf-16le as fallback
  }
  
  // Simple encoding detection - in production you might want to use a more robust solution
  const encodings: BufferEncoding[] = ['utf-16le', 'utf-8', 'latin1', 'ascii'];
  
  for (const encoding of encodings) {
    try {
      const text = buffer.toString(encoding);
      // Check if the text contains common CSV patterns
      if (text.includes(',') || text.includes('\t') || text.includes('firstname')) {
        return encoding;
      }
    } catch {
      continue;
    }
  }
  
  return 'utf-8'; // Default fallback
}

function analyzeBarcodes(csvContent: string): AnalysisResult {
  try {
    // Pre-process the content to remove problematic lines
    const cleanedContent = csvContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed !== '' && 
               trimmed !== '\r' && 
               !trimmed.match(/^\d+ rows affected\)?$/i) && // Remove SQL Server messages
               trimmed.split('\t').length >= 18; // Ensure we have enough fields
      })
      .join('\n');

    // Parse CSV content
    const parseResult = Papa.parse(cleanedContent, {
      header: true,
      skipEmptyLines: 'greedy', // More aggressive empty line skipping
      delimiter: '\t', // Handle tab-delimited files
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim() // Trim whitespace from values
    });

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        error: `CSV parsing error: ${parseResult.errors[0].message}`
      };
    }

    const data = parseResult.data as Record<string, string>[];

    // Basic validation
    const requiredColumns = ['firstname', 'lastname', 'BarcodeRangeID', 'TimeEntered'];
    const missingColumns = requiredColumns.filter(col => !data[0] || !(col in data[0]));
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        error: `Missing required columns: ${missingColumns.join(', ')}`
      };
    }

    // Group data by person and collect time entries
    const personDataMap = new Map<string, {
      firstname: string;
      lastname: string;
      timeEntries: string[];
      barcodeCount: number;
    }>();
    
    data.forEach((row) => {
      const key = `${row.firstname}_${row.lastname}`;
      if (!personDataMap.has(key)) {
        personDataMap.set(key, {
          firstname: row.firstname,
          lastname: row.lastname,
          timeEntries: [],
          barcodeCount: 0
        });
      }
      
      const personData = personDataMap.get(key)!;
      personData.timeEntries.push(row.TimeEntered);
      personData.barcodeCount++;
    });

    const peopleData: PersonData[] = Array.from(personDataMap.values()).map(person => {
      const workPeriods = calculateWorkPeriods(person.timeEntries);
      const totalHoursWorked = workPeriods.reduce((sum, period) => sum + period.duration_hours, 0);
      const barcodesPerHour = totalHoursWorked > 0 ? person.barcodeCount / totalHoursWorked : 0;
      
      return {
        firstname: person.firstname,
        lastname: person.lastname,
        barcode_range_count: person.barcodeCount,
        total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
        barcodes_per_hour: Math.round(barcodesPerHour * 100) / 100,
        work_periods: workPeriods
      };
    });

    // Sort by count descending
    peopleData.sort((a, b) => b.barcode_range_count - a.barcode_range_count);

    // Calculate statistics
    const totalPeople = peopleData.length;
    const totalRanges = peopleData.reduce((sum, person) => sum + person.barcode_range_count, 0);
    const averageRangesPerPerson = totalPeople > 0 ? totalRanges / totalPeople : 0;

    return {
      success: true,
      data: {
        people_data: peopleData,
        statistics: {
          total_people: totalPeople,
          total_ranges: totalRanges,
          average_ranges_per_person: Math.round(averageRangesPerPerson * 100) / 100
        },
        filename: 'uploaded_file.csv',
        upload_time: new Date().toISOString()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Error analyzing file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please upload a CSV file.'
      });
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const encoding = detectEncoding(buffer);
    const csvContent = buffer.toString(encoding);

    // Analyze the CSV
    const result = analyzeBarcodes(csvContent);

    if (result.success && result.data) {
      result.data.filename = file.name;
    }

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
