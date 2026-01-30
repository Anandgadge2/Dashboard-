require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const jwt = require("jsonwebtoken");

// Backend verifies SSO token with JWT_SECRET - must use same secret
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error("❌ JWT_SECRET is not set in .env. Set it to generate valid SSO tokens.");
  process.exit(1);
}

// Phone(s): from CLI arg or default to direct-SSO numbers
const phones = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["9021550841", "5555555555"];

const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║          SSO TOKEN GENERATOR - DIRECT LOGIN LINKS          ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

for (const phone of phones) {
  const payload = { phone: String(phone).replace(/\D/g, '').slice(-10), source: "MAIN_DASHBOARD" };
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });
  const url = `${baseUrl.replace(/\/$/, "")}/auth/sso?token=${token}`;
  console.log(`📱 Phone: ${payload.phone}`);
  console.log(`🔐 Token: ${token}`);
  console.log(`🌐 Direct login URL:\n   ${url}\n`);
}

console.log("Usage: node generate-sso-token.js [phone1] [phone2] ...");
console.log("Example: node generate-sso-token.js 9021550841 5555555555");
console.log("(With no args, generates links for 9021550841 and 5555555555.)\n");
