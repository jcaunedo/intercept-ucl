import carter from "./images/sample-patient-photo-carter.png";
import johnson from "./images/sample-patient-photo-johnson.png";
import miller from "./images/sample-patient-photo-miller.png";
import nakamura from "./images/sample-patient-photo-nakamura.png";
import ortega from "./images/sample-patient-photo-ortega.png";

// Sample patient photos, by patient id, shared by the Census, Monitoring and Patient details so a patient's avatar is the
// same on each (PRD PC-016). Five of the 20 have one; the rest show their initials. Carter's, Johnson's and Ortega's are
// intercept.ds avatar's w5, m3 and w7 (`1112:4118`); Norman's is an AI-generated portrait of a fictional person
// (Figma, Oct 31, 2026). None are real patients; an app gets photos from the EHR.
const samplePatientPhotos: Partial<Record<string, string>> = {
	p1: miller,
	p2: johnson,
	p5: carter,
	p17: ortega,
	p18: nakamura,
};

export { samplePatientPhotos };
