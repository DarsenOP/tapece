import React, { useState } from 'react';
import { Stage, Layer, Circle, Text } from 'react-konva';
import axios from 'axios';  // Add this

const App: React.FC = () => {
  const [nodes, setNodes] = useState<{ x: number; y: number; id: number }[]>([]);
  const [nextId, setNextId] = useState(1);

  const addNode = () => {
    setNodes([...nodes, { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100, id: nextId }]);
    setNextId(nextId + 1);
  };

  const generateJSON = async () => {
    const circuit = { nodes: nodes.map(n => ({ id: n.id, x: n.x, y: n.y })) };  // Add edges later
    console.log('Sending JSON to backend:', circuit);
    try {
      const response = await axios.post('/api/parse', circuit);  // Proxied to backend
      console.log('Backend response:', response.data);
      alert(`Backend parsed: ${response.data.nodes} nodes!`);
    } catch (error) {
      console.error('Send error:', error);
      alert('Error sending to backend—check console');
    }
  };

  return (
    <div style={{ textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>TapECE Circuit Builder MVP</h1>
      <button onClick={addNode} style={{ fontSize: '18px', padding: '10px 20px', marginBottom: '20px' }}>
        + Add Node
      </button>
      <button onClick={generateJSON} style={{ fontSize: '18px', padding: '10px 20px', marginLeft: '10px' }}>
        Export JSON (Auto Send)
      </button>
      <Stage width={600} height={400} style={{ border: '2px solid #ccc', background: '#fff', display: 'block', margin: '0 auto' }}>
        <Layer>
          {nodes.map((node) => (
            <Circle
              key={node.id}
              x={node.x}
              y={node.y}
              radius={25}
              fill="blue"
              stroke="black"
              strokeWidth={2}
              draggable
              onDragEnd={(e) => console.log(`Node ${node.id} moved to ${e.target.x()}, ${e.target.y()}`)}
              onClick={() => alert(`Node ${node.id} tapped! Future: Add R/VS/CS details.`)}
            />
          ))}
          <Text text="Tap + to add, drag to move, click for actions. Export sends to backend." x={10} y={10} fontSize={14} fill="gray" />
        </Layer>
      </Stage>
      <p>Nodes added: {nodes.length}</p>
    </div>
  );
};

export default App;
