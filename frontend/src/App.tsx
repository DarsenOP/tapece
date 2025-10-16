import React, { useState, useCallback, useEffect, memo } from 'react';
import './App.css';

// --- Constants ---
const MAX_COMPONENTS = 12;

// --- Type Definitions ---
interface Component {
  id: number;
  type: string;
  value: string;
  prefix: string;
  unit: string;
  nodeA: string;
  nodeB: string;
}

interface ComponentOption {
  name: string;
  unit: string;
}

interface Prefix {
  label: string;
  value: string;
}

interface PrefixSelectorProps {
  selectedPrefix: string;
  onSelect: (prefix: string) => void;
}

interface ComponentCardProps {
  component: Component;
  onDelete: (id: number) => void;
  onUpdate: (id: number, updatedComponent: Component) => void;
  isDeleting?: boolean;
}

// --- Mock Data ---
const initialComponents: Component[] = [
  { id: 1, type: 'Resistor', value: '100', prefix: 'k', unit: 'Ω', nodeA: '1', nodeB: '2' },
  { id: 2, type: 'Capacitor', value: '10', prefix: 'µ', unit: 'F', nodeA: '2', nodeB: '3' },
  { id: 3, type: 'Inductor', value: '5', prefix: 'm', unit: 'H', nodeA: '3', nodeB: 'GND' },
  { id: 4, type: 'Voltage Source', value: '12', prefix: 'none', unit: 'V', nodeA: 'GND', nodeB: '1' },
  { id: 5, type: 'Resistor', value: '50', prefix: 'none', unit: 'Ω', nodeA: '1', nodeB: '4' },
  { id: 6, type: 'Capacitor', value: '1', prefix: 'p', unit: 'F', nodeA: '4', nodeB: 'GND' },
  { id: 7, type: 'Inductor', value: '10', prefix: 'k', unit: 'H', nodeA: '3', nodeB: '4' },
];

const componentOptions: ComponentOption[] = [
  { name: 'Resistor', unit: 'Ω' },
  { name: 'Capacitor', unit: 'F' },
  { name: 'Inductor', unit: 'H' },
  { name: 'Voltage Source', unit: 'V' },
  { name: 'Current Source', unit: 'A' },
];

const prefixes: Prefix[] = [
  { label: 'p', value: 'p' },
  { label: 'n', value: 'n' },
  { label: 'µ', value: 'µ' },
  { label: 'm', value: 'm' },
  { label: '', value: 'none' },
  { label: 'k', value: 'k' },
  { label: 'M', value: 'M' },
  { label: 'G', value: 'G' },
];

// --- Helper Components ---
const PrefixSelector: React.FC<PrefixSelectorProps> = memo(({ selectedPrefix, onSelect }) => {
  return (
    <div className="prefix-select-container">
      {prefixes.map((p) => (
        <button
          key={p.value}
          className={`prefix-segment ${p.value === selectedPrefix ? 'selected' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            onSelect(p.value);
          }}
          title={p.label === '' ? 'No Prefix' : p.label}
        >
          {p.label || '—'}
        </button>
      ))}
    </div>
  );
});

const ComponentCard: React.FC<ComponentCardProps> = memo(({ 
  component, 
  onDelete, 
  onUpdate,
  isDeleting = false 
}) => {
  const handleDelete = () => onDelete(component.id);

  const handleUpdate = (field: keyof Component, value: string) => {
    onUpdate(component.id, { ...component, [field]: value });
  };

  return (
    <div className={`component-card ${isDeleting ? 'deleting' : ''}`}>
      <div className="card-header">
        <span className="comp-label">{component.type}</span>
        <button className="delete-btn" onClick={handleDelete} title="Remove Component">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="card-body">
        <div className="input-group-nodes">
          <div className="input-group node-input-half">
            <label className="input-label">Node A</label>
            <input
              className="magnitude-input-field"
              type="text"
              placeholder="e.g. 1"
              value={component.nodeA}
              onChange={(e) => handleUpdate('nodeA', e.target.value)}
            />
          </div>
          <div className="input-group node-input-half">
            <label className="input-label">Node B</label>
            <input
              className="magnitude-input-field"
              type="text"
              placeholder="e.g. 2"
              value={component.nodeB}
              onChange={(e) => handleUpdate('nodeB', e.target.value)}
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Magnitude ({component.unit})</label>
          <input
            className="magnitude-input-field"
            type="number"
            min="0"
            step="any"
            placeholder="1.0"
            value={component.value}
            onChange={(e) => handleUpdate('value', e.target.value)}
          />
        </div>
        
        <div className="input-group">
          <label className="input-label">Prefix</label>
          <PrefixSelector
            selectedPrefix={component.prefix}
            onSelect={(prefix) => handleUpdate('prefix', prefix)}
          />
        </div>
      </div>
    </div>
  );
});

// --- Main Application Component ---
const App: React.FC = () => {
  // State
  const [components, setComponents] = useState<Component[]>(initialComponents);
  const [solution, setSolution] = useState<string>('');
  const [displayedSolution, setDisplayedSolution] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);
  const [nextId, setNextId] = useState<number>(8);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isGridAnimating, setIsGridAnimating] = useState<boolean>(false);

  // Constants
  const UNMOUNT_DELAY_MS = 500;
  const TYPING_SPEED_MS = 10;
  const DELETION_ANIMATION_MS = 300;

  // Effects
  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuVisible(true);
    } else if (isMenuVisible) {
      const timer = setTimeout(() => setIsMenuVisible(false), UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen, isMenuVisible]);

  useEffect(() => {
    if (!isTyping || !solution) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= solution.length) {
        setDisplayedSolution(solution.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, TYPING_SPEED_MS);

    return () => clearInterval(typingInterval);
  }, [isTyping, solution]);

  // Event Handlers
  const handleAddComponent = (type: string, unit: string) => {
    if (components.length >= MAX_COMPONENTS) {
      alert(`Maximum of ${MAX_COMPONENTS} components allowed.`);
      return;
    }

    const newComponent: Component = {
      id: nextId,
      type,
      value: '1',
      prefix: 'none',
      unit,
      nodeA: String(nextId),
      nodeB: String(nextId + 1),
    };

    setComponents(prev => [...prev, newComponent]);
    setNextId(prev => prev + 1);
    setIsMenuOpen(false);
  };

  const handleDeleteComponent = useCallback((idToDelete: number) => {
    if (isGridAnimating) return;

    setIsGridAnimating(true);
    setDeletingId(idToDelete);

    setTimeout(() => {
      setComponents(prev => prev.filter(c => c.id !== idToDelete));
      setDeletingId(null);
      setTimeout(() => setIsGridAnimating(false), 100);
    }, DELETION_ANIMATION_MS);
  }, [isGridAnimating]);

  const handleUpdateComponent = useCallback((id: number, updatedComponent: Component) => {
    setComponents(prev => prev.map(c => c.id === id ? updatedComponent : c));
  }, []);

  const handleSolve = () => {
    const totalR = components.filter(c => c.type === 'Resistor').length;
    const totalC = components.filter(c => c.type === 'Capacitor').length;
    
    const newSolution = 
      `Analysis Complete (60 Hz):\n\n` +
      `Component Count: ${totalR} Resistors, ${totalC} Capacitors\n` +
      `Key Metric: Total Impedance Z = 1.25 kΩ ∠-15°\n` +
      `\n` +
      `Detailed Calculation:\n` +
      `Z = √(R_eq² + (X_L - X_C)²)\n\n` + 
      `where R_eq is the equivalent resistance.`;

    setSolution(newSolution);
    setDisplayedSolution('');
    setIsTyping(true);
  };

  // Derived State
  const isClosing = isMenuVisible && !isMenuOpen;

  return (
    <div className="container">
      {/* Left Panel - Component Inputs */}
      <div className="panel left-panel">
        <h2>Circuit Component Bank ({components.length}/{MAX_COMPONENTS})</h2>
        
        <div className={`components-grid ${isGridAnimating ? 'grid-animating' : ''}`}>
          {components.map(comp => (
            <ComponentCard 
              key={comp.id}
              component={comp} 
              onDelete={handleDeleteComponent} 
              onUpdate={handleUpdateComponent}
              isDeleting={deletingId === comp.id}
            />
          ))}
        </div>

        <button className="action-button solve-btn" onClick={handleSolve}>
          Solve Circuit
        </button>

        <button 
          className="add-btn" 
          onClick={() => setIsMenuOpen(true)} 
          title="Add Component"
          disabled={components.length >= MAX_COMPONENTS}
        >
          +
        </button>

        {/* Add Component Menu */}
        {isMenuVisible && (
          <div 
            className={`menu-backdrop ${isClosing ? 'closing' : ''}`} 
            onClick={() => setIsMenuOpen(false)}
          >
            <div 
              className={`menu-popup ${isClosing ? 'closing' : ''}`}
              onClick={(e) => e.stopPropagation()} 
            >
              <h3>Add Component</h3>
              <ul className="menu-list">
                {componentOptions.map((option) => (
                  <li 
                    key={option.name} 
                    className="menu-item" 
                    onClick={() => handleAddComponent(option.name, option.unit)}
                  >
                    {option.name} ({option.unit})
                  </li>
                ))}
              </ul>
              <button className="action-button close-menu-btn" onClick={() => setIsMenuOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Solution Output */}
      <div className="panel right-panel">
        <h2>Circuit Analysis Output</h2>
        <div className="solution-text">
          <span className={isTyping ? "typing-active" : ""}>
            {displayedSolution}
            {isTyping && <span className="typing-cursor">|</span>}
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
