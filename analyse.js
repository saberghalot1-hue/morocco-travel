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
