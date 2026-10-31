# EchoLearn

EchoLearn is a peer-to-peer skill exchange platform. Users list the skills they can teach and the skills they want to learn, and the app matches them with a compatible partner for live chat and video sessions.

**Live demo:** https://echolearn-e4go.onrender.com

## Features

- User registration and login with hashed passwords
- Skill-based matching using TF-IDF and cosine similarity, with a fallback to the closest matches
- Real-time text chat
- One-to-one video calls over WebRTC
- Screen sharing during calls
- Post-session ratings and feedback
- Editable user profiles

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Real-time:** Socket.IO, WebRTC
- **Matching:** natural (TF-IDF)


