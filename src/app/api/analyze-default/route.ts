import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface PersonData {
  firstname: string;
  lastname: string;
  barcode_range_count: number;
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

function detectEncoding(buffer: Buffer): BufferEncoding {
  // Check for UTF-16 BOM first
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return 'utf-16le';
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    return 'utf-16le'; // Node.js doesn't support utf-16be, use utf-16le as fallback
  }
  
  const encodings: BufferEncoding[] = ['utf-16le', 'utf-8', 'latin1', 'ascii'];
  
  for (const encoding of encodings) {
    try {
      const text = buffer.toString(encoding);
      if (text.includes(',') || text.includes('\t') || text.includes('firstname')) {
        return encoding;
      }
    } catch (error) {
      continue;
    }
  }
  
  return 'utf-8';
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

    const data = parseResult.data as any[];

    const requiredColumns = ['firstname', 'lastname', 'BarcodeRangeID'];
    const missingColumns = requiredColumns.filter(col => !data[0] || !(col in data[0]));
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        error: `Missing required columns: ${missingColumns.join(', ')}`
      };
    }

    const personCounts = new Map<string, number>();
    
    data.forEach((row) => {
      const key = `${row.firstname}_${row.lastname}`;
      personCounts.set(key, (personCounts.get(key) || 0) + 1);
    });

    const peopleData: PersonData[] = Array.from(personCounts.entries()).map(([key, count]) => {
      const [firstname, lastname] = key.split('_');
      return {
        firstname,
        lastname,
        barcode_range_count: count
      };
    });

    peopleData.sort((a, b) => b.barcode_range_count - a.barcode_range_count);

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
        filename: 'Taskmaster.csv',
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

export async function GET() {
  try {
    // Try to read the default CSV file from the public directory
    const defaultFilePath = path.join(process.cwd(), 'public', 'data', 'Taskmaster.csv');
    
    if (!fs.existsSync(defaultFilePath)) {
      return NextResponse.json({
        success: false,
        error: 'Default file not found'
      });
    }

    const buffer = fs.readFileSync(defaultFilePath);
    const encoding = detectEncoding(buffer);
    const csvContent = buffer.toString(encoding);

    const result = analyzeBarcodes(csvContent);

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Error reading default file: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
