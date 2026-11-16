const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const analyzeButton = document.getElementById("analyzeButton");
const result = document.getElementById("result");

imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (file) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";
        result.textContent = "Image sélectionnée. Vous pouvez lancer l'analyse.";
    }
});

analyzeButton.addEventListener("click", function () {
    if (!imageInput.files.length) {
        result.textContent = "Veuillez d'abord sélectionner une image.";
        return;
    }

    result.textContent =
        "Interface prête. La connexion à Azure AI Vision sera ajoutée dans la prochaine étape.";
});