"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalProvider = void 0;
class LocalProvider {
    /**
     * High performance local translation dictionary and phrase generator
     */
    static async translateSegments(params) {
        const { segments, sourceLang, targetLang } = params;
        // Common phrase dictionary for local testing / offline runs
        const dictionary = {
            hello: { km: 'សួស្តី', th: 'สวัสดี', vi: 'Xin chào', zh: '你好', ja: 'こんにちは', fr: 'Bonjour', es: 'Hola', de: 'Hallo' },
            welcome: { km: 'សូមស្វាគមន៍', th: 'ยินดีต้อนรับ', vi: 'Chào mừng', zh: '欢迎', ja: 'ようこそ', fr: 'Bienvenue', es: 'Bienvenido', de: 'Willkommen' },
            thank: { km: 'អរគុណ', th: 'ขอบคุณ', vi: 'Cảm ơn', zh: '谢谢', ja: 'ありがとう', fr: 'Merci', es: 'Gracias', de: 'Danke' },
        };
        return segments.map((seg) => {
            let translated = seg.text;
            const lower = seg.text.toLowerCase();
            for (const [key, mapping] of Object.entries(dictionary)) {
                if (lower.includes(key) && mapping[targetLang]) {
                    translated = translated.replace(new RegExp(key, 'gi'), mapping[targetLang]);
                }
            }
            if (translated === seg.text) {
                // Clear indication when local offline adapter runs without external API key
                translated = `[${targetLang.toUpperCase()}] ${seg.text}`;
            }
            return {
                segmentId: seg.id,
                translatedText: translated,
            };
        });
    }
}
exports.LocalProvider = LocalProvider;
