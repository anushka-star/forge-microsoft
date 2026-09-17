import { validateInput } from "./src/services/ai/ai.service.js";

const input = {
    developerId: "DEV001",
    language: "javascript",
    sourceCode: "const x = 10;",
    staticFindings: [],
    developerHistory: []
};

try {
    const result = validateInput(input);

    console.log("Input validation successful!");
    console.log(result);
} catch (error) {
    console.error("Validation failed:", error.message);
}