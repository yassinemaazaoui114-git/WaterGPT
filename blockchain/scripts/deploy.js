const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Déploiement du contrat AquaToken sur Polygon Amoy...");

  // Récupérer le déployeur
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Déployeur: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Solde: ${hre.ethers.formatEther(balance)} POL`);

  // Déployer le contrat
  console.log("⏳ Déploiement en cours...");
  const AquaToken = await hre.ethers.getContractFactory("AquaToken");
  const aquaToken = await AquaToken.deploy();
  await aquaToken.waitForDeployment();

  const contractAddress = await aquaToken.getAddress();
  console.log(`✅ Contrat déployé à: ${contractAddress}`);
  console.log(`🔗 Voir sur Polygonscan: https://amoy.polygonscan.com/address/${contractAddress}`);

  // Sauvegarder l'adresse du contrat
  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /CONTRACT_ADDRESS=.*/,
    `CONTRACT_ADDRESS=${contractAddress}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log("💾 Adresse sauvegardée dans .env");

  // Sauvegarder aussi pour le backend Python
  const backendEnvPath = path.join(__dirname, "../../backend/.env");
  let backendEnv = fs.readFileSync(backendEnvPath, "utf8");
  if (backendEnv.includes("CONTRACT_ADDRESS=")) {
    backendEnv = backendEnv.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    backendEnv += `\nCONTRACT_ADDRESS=${contractAddress}`;
  }
  fs.writeFileSync(backendEnvPath, backendEnv);
  console.log("💾 Adresse sauvegardée dans backend/.env");

  // Copier l'ABI pour le backend
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/AquaToken.sol/AquaToken.json"
  );
  const backendAbiPath = path.join(__dirname, "../../backend/abi/AquaToken.json");

  // Créer le dossier abi si nécessaire
  const abiDir = path.join(__dirname, "../../backend/abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Attendre que l'artifact soit créé
  setTimeout(() => {
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      fs.writeFileSync(backendAbiPath, JSON.stringify(artifact.abi, null, 2));
      console.log("💾 ABI copié vers backend/abi/AquaToken.json");
    }
  }, 2000);

  console.log("\n✨ Déploiement terminé avec succès!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Adresse: ${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });
