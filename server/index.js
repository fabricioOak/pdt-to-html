require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdf2html = require("pdf2html");
const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
	timeout: 60000,
});
const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use("/output", express.static("output"));

const outputDir = path.join(__dirname, "output");
if (fs.existsSync(outputDir)) {
	fs.rmdirSync(outputDir, { recursive: true });
}

app.post("/convert", upload.single("file"), async (req, res) => {
	const filePath = req.file.path;
	const outputFilePath = path.join(outputDir, `${req.file.filename}.html`);

	console.log(`Received file: ${filePath}`); // Log for debugging

	try {
		const htmlArray = await pdf2html.html(filePath);
		const htmlContent = Array.isArray(htmlArray)
			? htmlArray.join("\n")
			: htmlArray;

		const apiCompletion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content:
						"Ignore as metatag. Transforme este HTML deixando ele mais semântico e acessível.",
				},
				{
					role: "user",
					content: htmlContent,
				},
			],
		});

		const improvedHtml = apiCompletion.choices[0].message.content;

		fs.writeFileSync(outputFilePath, improvedHtml); // To save the improved HTML to a file
		fs.unlinkSync(filePath); // To delete the uploaded PDF file (OPTIONAL)

		console.log("File converted successfully!"); // Log for debugging

		res.json({
			success: true,
			file: `${req.file.filename}.html`,
		});
	} catch (err) {
		fs.unlinkSync(filePath);
		console.error("Error converting file:", err);
		res.status(500).json({ success: false });
	}
});

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
