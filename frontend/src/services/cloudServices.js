/**
 * VECNA-Pulse Direct Client-Side BYOK Cloud Connectors
 * Primary First-Class Support for SiliconFlow (SenseVoiceSmall + Qwen 2.5 7B),
 * Groq, and OpenRouter for free, zero-cost investigator intelligence.
 */

export async function callSiliconFlowSTT(apiKey, audioBlob) {
  if (!apiKey) throw new Error('SiliconFlow API key required');

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'FunAudioLLM/SenseVoiceSmall');

  const endpoints = [
    'https://api.siliconflow.cn/v1/audio/transcriptions',
    'https://api.siliconflow.com/v1/audio/transcriptions',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.text || '';
      }
    } catch (e) {}
  }
  return '';
}

export async function callSiliconFlowChat(apiKey, prompt) {
  if (!apiKey) throw new Error('SiliconFlow API key required');

  const endpoints = [
    'https://api.siliconflow.cn/v1/chat/completions',
    'https://api.siliconflow.com/v1/chat/completions',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
      }
    } catch (e) {}
  }
  return '';
}
