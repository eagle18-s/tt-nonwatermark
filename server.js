const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// index.html kök (root) hissədə olduğu üçün birbaşa buranı göstəririk
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, message: 'Lütfən keçərli TikTok linki daxil edin.' });
    }

    try {
        const response = await axios.post('https://www.tikwm.com/api/', {
            url: url,
            hd: 1
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const data = response.data;

        if (data.code === 0) {
            const rawUrl = data.data.hdplay || data.data.play;
            const cleanUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.tikwm.com${rawUrl}`;

            return res.json({
                success: true,
                title: data.data.title,
                cover: data.data.cover,
                author: data.data.author ? data.data.author.nickname : 'Bilinməyən istifadəçi',
                downloadUrl: cleanUrl
            });
        } else {
            return res.status(400).json({ success: false, message: 'Video tapılmadı və ya keçid xətası baş verdi.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Serverlə əlaqə qurularkən xəta baş verdi.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda aktivdir.`);
});
