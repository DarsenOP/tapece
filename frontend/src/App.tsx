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
}

// --- Mock Data ---
const initialComponents: Component[] = [
  { id: 1, type: 'Resistor', value: '1000', prefix: '', unit: 'Ω', nodeA: '1', nodeB: '2' },
  { id: 2, type: 'Resistor', value: '2000', prefix: '', unit: 'Ω', nodeA: '2', nodeB: '3' },
  { id: 3, type: 'Voltage Source', value: '12', prefix: '', unit: 'V', nodeA: 'GND', nodeB: '1' },
];

const componentOptions: ComponentOption[] = [
  { name: 'Resistor', unit: 'Ω' },
  { name: 'Voltage Source', unit: 'V' },
  { name: 'Current Source', unit: 'A' },
];

const prefixes: Prefix[] = [
  { label: 'p', value: 'p' },
  { label: 'n', value: 'n' },
  { label: 'µ', value: 'µ' },
  { label: 'm', value: 'm' },
  { label: '', value: '' },
  { label: 'k', value: 'k' },
  { label: 'M', value: 'M' },
];

// --- Helper Functions ---
const getPrefixMultiplier = (prefix: string): number => {
  const multipliers: { [key: string]: number } = {
    'p': 1e-12,
    'n': 1e-9,
    'µ': 1e-6,
    'm': 1e-3,
    '': 1,
    'k': 1e3,
    'M': 1e6,
  };
  return multipliers[prefix] || 1;
};

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
}) => {
  const handleDelete = () => onDelete(component.id);

  const handleUpdate = (field: keyof Component, value: string) => {
    onUpdate(component.id, { ...component, [field]: value });
  };

  return (
    <div className="component-card">
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

// --- Theme Toggle Component ---
const ThemeToggle: React.FC<{ isDark: boolean; onToggle: () => void }> = memo(({ isDark, onToggle }) => {
  return (
    <button 
      className="theme-toggle-btn"
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="theme-toggle-icons">
        {/* Sun Icon */}
        <svg className={`sun-icon ${isDark ? 'active' : ''}`} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor"/>
          <line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        
        {/* Moon Icon */}
        <svg className={`moon-icon ${!isDark ? 'active' : ''}`} viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                fill="currentColor"/>
        </svg>
      </div>
    </button>
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
  const [nextId, setNextId] = useState<number>(4);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Constants
  const UNMOUNT_DELAY_MS = 500;
  const TYPING_SPEED_MS = 10;

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

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Event Handlers
  const handleAddComponent = useCallback((type: string, unit: string) => {
    if (components.length >= MAX_COMPONENTS) {
      alert(`Maximum of ${MAX_COMPONENTS} components allowed.`);
      return;
    }

    const newComponent: Component = {
      id: nextId,
      type,
      value: '1',
      prefix: '',
      unit,
      nodeA: '1',
      nodeB: '2',
    };

    setComponents(prev => [...prev, newComponent]);
    setNextId(prev => prev + 1);
    setIsMenuOpen(false);
  }, [components.length, nextId]);

  const handleDeleteComponent = useCallback((idToDelete: number) => {
    setComponents(prev => prev.filter(c => c.id !== idToDelete));
  }, []);

  const handleUpdateComponent = useCallback((id: number, updatedComponent: Component) => {
    setComponents(prev => prev.map(c => c.id === id ? updatedComponent : c));
  }, []);

  const handleCleanAll = useCallback(() => {
    if (components.length === 0) return;
    
    if (window.confirm('Are you sure you want to delete all components?')) {
      setComponents([]);
      setSolution('');
      setDisplayedSolution('');
    }
  }, [components.length]);

  const handleSolve = useCallback(() => {
    const circuitData = {
      components: components.map(comp => ({
        type: comp.type,
        value: parseFloat(comp.value) * getPrefixMultiplier(comp.prefix),
        nodeA: comp.nodeA,
        nodeB: comp.nodeB,
        unit: comp.unit
      }))
    };

    console.log('Sending to backend:', circuitData);

    const mockSolution = 
      `Circuit Analysis Results:\n\n` +
      `Components:\n${components.map(comp => 
        `- ${comp.type}: ${comp.value} ${comp.prefix}${comp.unit} between nodes ${comp.nodeA} and ${comp.nodeB}`
      ).join('\n')}\n\n` +
      `Matrix Equation:\n` +
      `[G][V] = [I]\n\n` +
      `Where:\n` +
      `- G is the conductance matrix\n` +
      `- V is the node voltage vector\n` +
      `- I is the current source vector\n\n` +
      `Node Voltages:\n` +
      `V1 = 12.00 V\n` +
      `V2 = 8.57 V\n` +
      `V3 = 4.29 V\n\n` +
      `Ready for real backend integration!`;

    setSolution(mockSolution);
    setDisplayedSolution('');
    setIsTyping(true);
  }, [components]);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const isClosing = isMenuVisible && !isMenuOpen;

  return (
    <div className="app-container">
      <ThemeToggle isDark={isDarkMode} onToggle={handleThemeToggle} />
      
      <div className="container">
        {/* Left Panel - Component Inputs */}
        <div className="panel left-panel">
          <h2>Circuit Component Bank ({components.length}/{MAX_COMPONENTS})</h2>
          
          <div className="components-grid">
            {components.map(comp => (
              <ComponentCard 
                key={comp.id}
                component={comp} 
                onDelete={handleDeleteComponent} 
                onUpdate={handleUpdateComponent}
              />
            ))}
          </div>

          <button className="action-button solve-btn" onClick={handleSolve}>
            Solve Circuit
          </button>

          <button 
            className="action-button clean-btn" 
            onClick={handleCleanAll}
            disabled={components.length === 0}
            title="Delete all components"
          >
            Clean All
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
    </div>
  );
};

export default App;
