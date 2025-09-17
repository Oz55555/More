# Cadence Wave - Digital Transformation Consultancy

A modern, responsive corporate website for Cadence Wave digital transformation consultancy with backend database integration for contact form submissions and consultancy bookings.

## Features

- **Modern UI/UX**: Clean, professional design with smooth animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Contact Form**: Fully functional contact form with database storage
- **Form Validation**: Client-side and server-side validation
- **Real-time Notifications**: Success/error messages for user feedback
- **Database Integration**: MongoDB storage for contact submissions
- **Admin Dashboard**: View all contact form submissions

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Font Awesome icons
- Google Fonts (Poppins)
- Responsive CSS Grid & Flexbox

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Express Validator for form validation
- CORS for cross-origin requests
- Helmet for security headers

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Add your MongoDB connection string and OpenAI API key
5. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

- `MONGODB_URI`: Your MongoDB Atlas connection string
- `OPENAI_API_KEY`: Your OpenAI API key (optional - tone analysis will be skipped if not provided)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

### Contact Form
- `POST /api/contact`: Submit contact form (now includes tone analysis)

### Admin Endpoints
- `GET /api/contacts`: Get all contact submissions
- `GET /api/contacts?includeTone=true`: Get contacts with tone analysis data
- `GET /api/contacts/tone-stats`: Get aggregated tone analysis statistics
- `GET /api/health`: Health check

### Example API Responses

**Contact Submission with Tone Analysis:**
```json
{
  "success": true,
  "message": "Thank you for your message! I will get back to you soon.",
  "data": {
    "id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "submittedAt": "2023-09-06T10:30:00.000Z",
    "toneAnalysis": {
      "sentiment": "positive",
      "emotion": "joy",
      "confidence": 0.85
    }
  }
}
```

**Tone Statistics:**
```json
{
  "success": true,
  "data": {
    "totalAnalyzed": 25,
    "sentimentStats": {
      "positive": 15,
      "neutral": 8,
      "negative": 2
    },
    "emotionStats": {
      "joy": 12,
      "neutral": 8,
      "surprise": 3,
      "sadness": 2
    },
    "averageConfidence": 0.78
  }
}
```

## 🔧 Configuration

### OpenAI API Setup
1. Sign up at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

### Fallback Behavior
If no OpenAI API key is provided, the system uses a simple keyword-based analysis as fallback, ensuring the contact form always works.

## 📊 Monitoring & Analytics

The tone analysis feature provides valuable insights:
- Track customer sentiment trends over time
- Identify urgent or negative messages for priority response
- Understand the emotional context of inquiries
- Generate reports on communication patterns

## License

MIT License - feel free to use this template for your own portfolio!

## Project Structure

```
personal-website/
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   └── main.js           # Frontend JavaScript
├── models/
│   └── Contact.js        # MongoDB contact model
├── index.html            # Main HTML file
├── server.js             # Express server
├── package.json          # Dependencies
├── .env                  # Environment variables
└── README.md            # This file
```

## Customization

1. **Personal Information**: Update the content in `index.html`
2. **Projects**: Modify the `projects` array in `js/main.js`
3. **Colors**: Change CSS variables in `css/style.css`
4. **Social Links**: Update social media links in the contact section

## Database Schema

Contact form submissions are stored with the following fields:
- `name`: Sender's name
- `email`: Sender's email address
- `message`: Message content
- `submittedAt`: Timestamp of submission
- `ipAddress`: IP address (for security)
- `userAgent`: Browser information

## Security Features

- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- Rate limiting ready (can be added)
- Environment variable protection

## Deployment

The website can be deployed to various platforms:
- **Heroku**: Add MongoDB Atlas connection
- **Vercel/Netlify**: For frontend only
- **DigitalOcean/AWS**: Full-stack deployment

## License

MIT License - feel free to use this template for your own portfolio!
