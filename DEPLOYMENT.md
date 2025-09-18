# Next.js Warehouse KPI Dashboard - Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial Next.js commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/warehouse-kpi-nextjs.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect Next.js and configure everything

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   npm run deploy
   ```

3. **Follow the prompts**
   - Link to existing project or create new one
   - Set up project settings
   - Deploy

## 🏃‍♂️ Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
warehouse-kpi-nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts          # CSV upload API
│   │   │   └── analyze-default/route.ts # Default data analysis API
│   │   ├── page.tsx                     # Main dashboard page
│   │   ├── layout.tsx                   # Root layout
│   │   └── globals.css                  # Global styles
│   └── components/                      # React components (if needed)
├── public/
│   └── data/
│       └── Taskmaster.csv              # Default data file
├── package.json                        # Dependencies and scripts
├── vercel.json                         # Vercel configuration
└── tailwind.config.js                  # Tailwind CSS config
```

## ✨ Features

- 📊 **Interactive Bar Charts**: Values displayed on top of each bar
- 📁 **CSV Upload**: Drag-and-drop file upload with automatic encoding detection
- 📈 **Real-time Analysis**: Instant data processing and visualization
- 📤 **Export Functionality**: Download analysis results as CSV
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🎨 **Modern UI**: Clean, professional interface with Tailwind CSS
- ⚡ **Fast Performance**: Built with Next.js 15 and React 19

## 🔧 Configuration

### Environment Variables
No environment variables required for basic functionality.

### File Upload Limits
- Vercel has a 4.5MB limit for serverless functions
- For larger files, consider using external storage (AWS S3, etc.)

### Custom Domain
To use a custom domain:
1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## 🐛 Troubleshooting

### Common Issues:

1. **Build Errors**: Make sure all dependencies are installed with `npm install`
2. **CSV Upload Issues**: Check file size and format
3. **Chart Not Displaying**: Ensure Chart.js dependencies are properly installed

### Development vs Production:

- **Development**: Uses Turbopack for faster builds
- **Production**: Optimized build with static generation where possible

## 📊 API Endpoints

- `POST /api/upload` - Upload and analyze CSV file
- `GET /api/analyze-default` - Analyze default CSV file

## 🎯 Performance

- **Client-side**: React 19 with optimized rendering
- **Server-side**: Next.js API routes with efficient CSV processing
- **Charts**: Chart.js with datalabels plugin for value display
- **Styling**: Tailwind CSS for fast, utility-first styling

## 🔄 Updates

To update the application:
1. Make your changes
2. Test locally with `npm run dev`
3. Deploy with `npm run deploy` or push to GitHub

## 📝 Notes

- The application automatically handles different CSV encodings
- Charts are responsive and work on all screen sizes
- Data is processed client-side for better performance
- No database required - all data is processed in memory
