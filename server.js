const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Kısa TikTok bağlantılarını gerçek uzun URL'e dönüştüren fonksiyon
async function getExpandedUrl(url) {
    try {
        const response = await axios.get(url, {
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        return response.request.res.responseUrl || url;
    } catch (error) {
        return url;
    }
}

app.post('/api/download', async (req, res) => {
    let { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, message: 'Lütfən keçərli TikTok linki daxil edin.' });
    }

    try {
        // 1. Kısa linki çözümlüyoruz
        const targetUrl = await getExpandedUrl(url);

        // 2. Birinci Yöntem: TikWM API
        try {
            const response = await axios.post('https://www.tikwm.com/api/', {
                url: targetUrl,
                hd: 1
            }, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (response.data && response.data.code === 0) {
                const data = response.data.data;
                const rawUrl = data.hdplay || data.play;
                const cleanUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.tikwm.com${rawUrl}`;

                return res.json({
                    success: true,
                    title: data.title || 'TikTok Video',
                    cover: data.cover,
                    author: data.author ? data.author.nickname : 'Bilinməyən müəllif',
                    downloadUrl: cleanUrl
                });
            }
        } catch (e) {
            console.log("TikWM API hatası, yedek API'ye geçiliyor...");
        }

        // 3. İkinci Yöntem (Yedek API): TiklyDown API
        const backupRes = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(targetUrl)}`, {
            timeout: 8000
        });

        if (backupRes.data && backupRes.data.video && backupRes.data.video.noWatermark) {
            return res.json({
                success: true,
                title: backupRes.data.title || 'TikTok Video',
                cover: backupRes.data.cover || '',
                author: backupRes.data.author ? backupRes.data.author.name : 'Bilinməyən müəllif',
                downloadUrl: backupRes.data.video.noWatermark
            });
        }

        return res.status(400).json({ success: false, message: 'Video tapılmadı və ya link yalnışdır.' });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Serverlə əlaqə qurularkən xəta baş verdi.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda aktivdir.`);
});
                            
