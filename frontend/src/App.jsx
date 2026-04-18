import WaterGPTWidget from "./components/WaterGPTWidget"

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#005d90] mb-2">AquaToken</h1>
        <p className="text-gray-500">Plateforme de conservation d'eau</p>
        <p className="text-sm text-gray-400 mt-4">
          👉 Cliquez sur le bouton bleu en bas à droite pour ouvrir WaterGPT
        </p>
      </div>
      <WaterGPTWidget
        crop_type="olive"
        region="Sfax"
        expected_water={1000}
        actual_water={800}
        tokens={150}
        trust_score={0.85}
      />
    </div>
  )
}

export default App
