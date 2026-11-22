const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const analyzeButton = document.getElementById("analyzeButton");
const result = document.getElementById("result");

let selectedDataUrl = null;

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    selectedDataUrl = reader.result;
    imagePreview.src = selectedDataUrl;
    imagePreview.style.display = "block";
    result.textContent = "Image sélectionnée. Vous pouvez lancer l'analyse.";
  };
  reader.readAsDataURL(file);
});

analyzeButton.addEventListener("click", async function () {
  if (!selectedDataUrl) {
    result.textContent = "Veuillez d'abord sélectionner une image.";
    return;
  }

  result.textContent = "Analyse en cours...";
  try {
    const analyzeRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: selectedDataUrl }),
    });
    const analyzeData = await analyzeRes.json();
    if (!analyzeRes.ok) throw new Error(analyzeData.error || JSON.stringify(analyzeData));

    const caption = analyzeData.captionResult?.text || "Aucune description détectée.";
    const tags = (analyzeData.tagsResult?.values || [])
      .slice(0, 5)
      .map((t) => t.name)
      .join(", ");

    let translated = "";
    try {
      const trRes = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: caption, to: "fr" }),
      });
      const trData = await trRes.json();
      if (trRes.ok) translated = trData?.[0]?.translations?.[0]?.text || "";
    } catch (_) {}

    result.textContent =
      `Description (IA): ${caption}` +
      (translated ? `\nTraduction (FR): ${translated}` : "") +
      (tags ? `\nTags: ${tags}` : "");
  } catch (err) {
    result.textContent = "Erreur lors de l'analyse : " + err.message;
  }
});

const translateInput = document.getElementById("translateInput");
const targetLang = document.getElementById("targetLang");
const translateButton = document.getElementById("translateButton");
const translateResult = document.getElementById("translateResult");

if (translateButton) {
  translateButton.addEventListener("click", async function () {
    const text = (translateInput.value || "").trim();
    const to = targetLang.value || "fr";
    if (!text) {
      translateResult.textContent = "Veuillez entrer un texte à traduire.";
      return;
    }

    translateResult.textContent = "Traduction en cours...";
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      const translated = data?.[0]?.translations?.[0]?.text || "";
      translateResult.textContent = translated ? `Résultat : ${translated}` : "Aucune traduction reçue.";
    } catch (err) {
      translateResult.textContent = "Erreur de traduction : " + err.message;
    }
  });
}
