const API_KEY = "AIzaSyA_CudCVDmGxOY4S1T3cKT60DJEhekre3w";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AIzaSyA_CudCVDmGxOY4S1T3cKT60DJEhekre3w}`;

const searchBtn = document.getElementById('searchBtn');
const userInput = document.getElementById('userInput');
const resultDiv = document.getElementById('result');

searchBtn.addEventListener('click', async () => {
    const text = userInput.value;
    if (!text) return alert("Typ eerst even wat je zoekt!");

    resultDiv.innerHTML = "Aan het nadenken...";

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Jij bent een expert in computers. Geef advies over welke PC of laptop de gebruiker moet kopen op basis van deze vraag: " + text }] }]
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        resultDiv.innerText = aiResponse;

    } catch (error) {
        resultDiv.innerText = "Oeps, er ging iets mis. Controleer je API sleutel.";
        console.error(error);
    }
});
