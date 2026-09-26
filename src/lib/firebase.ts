import { getAI, getGenerativeModel, GoogleAIBackend, ThinkingLevel } from 'firebase/ai';
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import type { GenerateText } from '../ai/client';
import { SYSTEM_INSTRUCTION } from '../ai/prompts';
import { firebaseConfig, geminiModels, recaptchaSiteKey } from '../config';

/** Calls Gemini through Firebase AI Logic, so no Gemini API key ships to the browser. */
export function createFirebaseGenerator(): GenerateText {
  const app = initializeApp(firebaseConfig);
  if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  if (firebaseConfig.measurementId) {
    void import('firebase/analytics').then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) getAnalytics(app);
    });
  }
  const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: Boolean(recaptchaSiteKey) });

  return async ({ prompt, tier, pdfBase64, responseJsonSchema }) => {
    const model = getGenerativeModel(ai, {
      model: geminiModels[tier],
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    const parts = pdfBase64 ? [prompt, { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }] : [prompt];
    const result = await model.generateContent(parts);
    return result.response.text();
  };
}
