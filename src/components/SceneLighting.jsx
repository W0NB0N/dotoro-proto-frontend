export default function SceneLighting({ theme }) {
  const ambientColor = '#0b1611'; // Room ambiance
  const keyLightColor = '#f1f5f9'; // Bright slate white key light

  return (
    <>
      {/* 1. Ambient Light - room ambiance */}
      <ambientLight color={ambientColor} intensity={0.9} />

      {/* 2. Key Light - key light from front-right to shape the 3D model */}
      <directionalLight
        position={[4, 5, 3]}
        color={keyLightColor}
        intensity={0.75}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* 3. Side accent light to fill the 3D shape */}
      <directionalLight
        position={[5, -2, -2]}
        color="#022c22"
        intensity={0.4}
      />

      {/* 4. Soft warm fill light from below-front to reveal keyboard details */}
      <directionalLight
        position={[0, -2, 3]}
        color="#ffd1a9"
        intensity={0.25}
      />
    </>
  );
}
