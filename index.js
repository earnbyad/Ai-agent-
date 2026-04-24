const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = 'EAAfKsN1rdwQBRUUoDxENa332CidZBBmSBLP2GhfutCLt867XbxdETPtB4cxlKSau2eu0ZCAbz8AD8i2VGxmhK0Mz7v3tzhmDZCyrLbGXP6J9x5JfKNZBBAv3Nn4dtjUbpTEaKdxXE481TpKuSRcXQFe6t8fUWMlAK9ZAO9P0FL6MAYKTaRxKev9GdLWHfUulWTxdZAWJGuqtFZCh5wVIYdSk47tLfgmcF6eeWEQ';
const GEMINI_API_KEY = 'AIzaSyCiCVRk0vQ7O4VECTldGikOfwsl4Gdvw78';

// ১. ব্রাউজারে স্ট্যাটাস চেক করার জন্য (Root Route)
app.get('/', async (req, res) => {
    let statusReport = "<h1>Bdstored AI Status Checker</h1>";
    
    // Gemini Test
    try {
        await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
            contents: [{ parts: [{ text: "Hi" }] }]
        });
        statusReport += "<p style='color:green'>✅ Gemini API: Working!</p>";
    } catch (e) {
        statusReport += "<p style='color:red'>❌ Gemini API: Failed! (Check your API Key)</p>";
    }

    // Facebook Token Test
    try {
        await axios.get(`https://graph.facebook.com/v21.0/me?access_token=${PAGE_ACCESS_TOKEN}`);
        statusReport += "<p style='color:green'>✅ Facebook Token: Valid!</p>";
    } catch (e) {
        statusReport += "<p style='color:red'>❌ Facebook Token: Invalid! (Error: " + e.response.data.error.message + ")</p>";
    }

    statusReport += "<hr><p>Webhook URL for Facebook: <b>" + req.protocol + '://' + req.get('host') + "/webhook</b></p>";
    statusReport += "<p>Verify Token: <b>bdstored_token</b></p>";
    
    res.send(statusReport);
});

// ২. ফেসবুক ওয়েব-হুক ভেরিফিকেশন
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token === 'bdstored_token') {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// ৩. মেসেজ রিসিভ এবং রিপ্লাই লজিক
app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(async (entry) => {
            if (entry.messaging) {
                let webhook_event = entry.messaging[0];
                let sender_psid = webhook_event.sender.id;
                let user_message = webhook_event.message ? webhook_event.message.text : null;

                if (user_message) {
                    console.log("Message received: " + user_message);
                    const aiResponse = await askGemini(user_message);
                    sendResponse(sender_psid, aiResponse);
                }
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// ৪. Gemini AI ফাংশন
async function askGemini(prompt) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: `You are the AI of Bdstored. Speak in Bengali. User: ${prompt}` }] }]
        });
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini Error: ", error.message);
        return "ধন্যবাদ Bdstored এ মেসেজ দেওয়ার জন্য। আমরা শীঘ্রই উত্তর দিব।";
    }
}

// ৫. ফেসবুক রিপ্লাই ফাংশন
function sendResponse(psid, responseText) {
    axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: psid },
        message: { text: responseText }
    }).then(() => {
        console.log("Response sent to Facebook!");
    }).catch(err => {
        console.error("FB Send Error: ", err.response.data.error.message);
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bdstored AI is running on port ${PORT}`));

app.get('/privacy', (req, res) => {
    res.send("<h1>Privacy Policy</h1><p>Bdstored AI agent respects your privacy.</p>");
});
