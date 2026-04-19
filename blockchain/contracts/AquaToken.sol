// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Contrat ERC20 simplifié pour AquaToken
// Récompense les agriculteurs qui économisent de l'eau

contract AquaToken {
    // ═══════════════════════════════
    // VARIABLES D'ÉTAT
    // ═══════════════════════════════

    string public name = "AquaToken";
    string public symbol = "AQUA";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    address public owner;

    // Balances par adresse
    mapping(address => uint256) public balanceOf;

    // Allowances pour transferts délégués
    mapping(address => mapping(address => uint256)) public allowance;

    // Historique des mints par utilisateur
    mapping(address => uint256) public totalMinted;
    mapping(address => uint256) public lastMintTimestamp;

    // Mapping aqua_id → adresse wallet
    mapping(string => address) public aquaIdToAddress;
    mapping(address => string) public addressToAquaId;

    // ═══════════════════════════════
    // ÉVÉNEMENTS
    // ═══════════════════════════════

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event WaterSaved(
        address indexed farmer,
        string aquaId,
        uint256 quotaLitres,
        uint256 realLitres,
        uint256 economieLitres,
        uint256 tokensMinteD,
        uint256 timestamp
    );
    event FarmerRegistered(address indexed farmer, string aquaId);

    // ═══════════════════════════════
    // MODIFICATEURS
    // ═══════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "AquaToken: pas autorise");
        _;
    }

    modifier onlyRegistered() {
        require(
            bytes(addressToAquaId[msg.sender]).length > 0,
            "AquaToken: agriculteur non enregistre"
        );
        _;
    }

    // ═══════════════════════════════
    // CONSTRUCTEUR
    // ═══════════════════════════════

    constructor() {
        owner = msg.sender;
        // Mint initial de 0 tokens — tout vient des récompenses
        totalSupply = 0;
    }

    // ═══════════════════════════════
    // FONCTIONS ERC20 STANDARD
    // ═══════════════════════════════

    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "AquaToken: adresse invalide");
        require(balanceOf[msg.sender] >= amount, "AquaToken: solde insuffisant");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "AquaToken: solde insuffisant");
        require(allowance[from][msg.sender] >= amount, "AquaToken: allowance insuffisante");

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }

    // ═══════════════════════════════
    // FONCTIONS AQUATOKEN SPÉCIFIQUES
    // ═══════════════════════════════

    // Enregistrer un agriculteur avec son AQ-ID
    function registerFarmer(address farmer, string memory aquaId)
        public onlyOwner
    {
        require(farmer != address(0), "AquaToken: adresse invalide");
        require(bytes(aquaId).length > 0, "AquaToken: aquaId invalide");
        require(
            aquaIdToAddress[aquaId] == address(0),
            "AquaToken: aquaId deja utilise"
        );

        aquaIdToAddress[aquaId] = farmer;
        addressToAquaId[farmer] = aquaId;

        emit FarmerRegistered(farmer, aquaId);
    }

    // Mint des tokens pour un agriculteur qui a économisé de l'eau
    // Appelé par le backend après vérification
    function mintWaterReward(
        address farmer,
        string memory aquaId,
        uint256 quotaLitres,
        uint256 realLitres,
        uint256 tokensAmount
    ) public onlyOwner {
        // Vérifications de sécurité
        require(farmer != address(0), "AquaToken: adresse invalide");
        require(realLitres < quotaLitres, "AquaToken: pas d economie");
        require(tokensAmount > 0, "AquaToken: montant invalide");

        // Limite: max 1,000,000 tokens par mint
        uint256 maxMint = 1_000_000 * 10**decimals;
        require(tokensAmount <= maxMint, "AquaToken: montant trop eleve");

        uint256 economie = quotaLitres - realLitres;

        // Mint les tokens
        uint256 amount = tokensAmount * 10**decimals;
        totalSupply += amount;
        balanceOf[farmer] += amount;

        // Mettre à jour l'historique
        totalMinted[farmer] += amount;
        lastMintTimestamp[farmer] = block.timestamp;

        emit Transfer(address(0), farmer, amount);
        emit WaterSaved(
            farmer,
            aquaId,
            quotaLitres,
            realLitres,
            economie,
            amount,
            block.timestamp
        );
    }

    // Transfert entre agriculteurs via AQ-ID
    function transferByAquaId(
        string memory toAquaId,
        uint256 amount
    ) public onlyRegistered returns (bool) {
        address to = aquaIdToAddress[toAquaId];
        require(to != address(0), "AquaToken: destinataire non trouve");
        require(balanceOf[msg.sender] >= amount * 10**decimals,
                "AquaToken: solde insuffisant");

        balanceOf[msg.sender] -= amount * 10**decimals;
        balanceOf[to] += amount * 10**decimals;

        emit Transfer(msg.sender, to, amount * 10**decimals);
        return true;
    }

    // Récupérer le solde en tokens (sans les décimales)
    function getBalance(address farmer) public view returns (uint256) {
        return balanceOf[farmer] / 10**decimals;
    }

    // Récupérer l'adresse d'un AQ-ID
    function getAddressByAquaId(string memory aquaId)
        public view returns (address)
    {
        return aquaIdToAddress[aquaId];
    }

    // Burn des tokens (pour marketplace)
    function burn(uint256 amount) public {
        uint256 amountWithDecimals = amount * 10**decimals;
        require(balanceOf[msg.sender] >= amountWithDecimals,
                "AquaToken: solde insuffisant");

        balanceOf[msg.sender] -= amountWithDecimals;
        totalSupply -= amountWithDecimals;

        emit Transfer(msg.sender, address(0), amountWithDecimals);
    }
}
