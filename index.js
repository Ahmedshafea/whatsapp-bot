require("dotenv").config();
const fs = require("fs");
const https = require("https");
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "your-verify-token";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

//const agent = new https.Agent({
   // cert: fs.readFileSync("certificate.pem"), // تحميل الشهادة
//});

const agent = null; // تعطيل استخدام الشهادة مؤقتًا

// 📌 إعداد Webhook لاستقبال التحديثات من واتساب
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified successfully!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 📩 استقبال رسائل الواتساب الواردة
app.post("/webhook", (req, res) => {
    console.log("📩 Received webhook data:", JSON.stringify(req.body, null, 2));

    if (req.body.entry) {
        const message = req.body.entry[0]?.changes[0]?.value?.messages?.[0];
        if (message) {
            const sender = message.from;
            const text = message.text?.body || "رسالة غير مدعومة";

            console.log(`📨 رسالة من ${sender}: ${text}`);
            sendWhatsAppMessage(sender, `👋 مرحبًا! لقد استلمنا رسالتك: ${text}`);
        }
    }

    res.sendStatus(200);
});

// 📨 إرسال رسالة عبر WhatsApp API
const sendWhatsAppMessage = async (to, text) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: { body: text },
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
                httpsAgent: agent, // استخدام الشهادة
            }
        );
        console.log("✅ تم إرسال الرسالة بنجاح:", response.data);
    } catch (error) {
        console.error("❌ فشل إرسال الرسالة:", error.response?.data || error.message);
    }
};

// 🚀 تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
