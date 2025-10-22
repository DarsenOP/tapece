import React, { useState, useCallback, useEffect, memo } from 'react';
import LatexRenderer from './components/LatexRenderer';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// ===== Constants =====
const MAX_COMPONENTS = 12;

// ===== Type Definitions =====
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

interface MatrixSolution {
  conductance_matrix?: number[][];
  current_vector?: number[];
  voltage_solution?: number[];
  matrix_equation?: string;
  solution_method?: string;
  steps?: string[];
  verification?: {
    residual?: number[];
    max_error?: number;
  };
}

interface ComponentResult {
  id: string;
  type: string;
  value: number;
  node1: number;
  node2: number;
  voltage: number;
  current: number;
  power: number;
  description: string;
}

interface CircuitSolution {
  status: string;
  voltages: { [node: number]: number };
  components: ComponentResult[];
  total_power: number;
  matrix_solution?: MatrixSolution;
  summary: {
    total_components: number;
    solved_nodes: number;
    power_balance: boolean;
  };
}

interface SolutionData {
  overview: {
    title: string;
    subtitle: string;
    summary: string;
  };
  circuitStatistics: {
    totalNodes: number;
    referenceNode: number;
    nonReferenceNodes: number[];
    supernodes: number[][];
    components: {
      resistors: number;
      voltageSources: number;
      currentSources: number;
      total: number;
    };
  };
  components: Array<{
    id: string;
    type: string;
    value: string;
    nodes: string;
    description: string;
    currentFlow?: string;
    constraint?: string;
  }>;
  analysisMethod: {
    name: string;
    description: string;
    steps: string[];
    conventions: {
      Resistor: string;
      VoltageSource: string;
      CurrentSource: string;
    };
  };
  solutionSteps: Array<{
    type: string;
    stepNumber?: number;
    title: string;
    description: string;
    equation: string;
    explanation: string;
    keyPoint?: string;
  }>;
  matrixFormulation: {
    description: string;
    equation: string;
    explanation: string;
  };
  numericalSolution?: CircuitSolution;
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

// ===== Mock Data =====
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

// ===== Helper Functions =====
const getPrefixMultiplier = (prefix: string): number => {
  const multipliers: Record<string, number> = {
    p: 1e-12,
    n: 1e-9,
    µ: 1e-6,
    m: 1e-3,
    '': 1,
    k: 1e3,
    M: 1e6,
  };
  return multipliers[prefix] || 1;
};

// ===== SVG Icons =====
const CircuitIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" />
    <path d="M8 7V17M16 7V17M12 7V17" strokeLinecap="round" />
    <circle cx="6" cy="7" r="1" fill="currentColor" />
    <circle cx="6" cy="17" r="1" fill="currentColor" />
    <circle cx="18" cy="7" r="1" fill="currentColor" />
    <circle cx="18" cy="17" r="1" fill="currentColor" />
  </svg>
);

const NodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M12 2V6M12 18V22M2 12H6M18 12H22" strokeLinecap="round"/>
  </svg>
);

const SupernodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="12" r="3"/>
    <circle cx="16" cy="12" r="3"/>
    <path d="M11 12H13M8 12H16" strokeLinecap="round"/>
    <path d="M5 12H8M16 12H19" strokeLinecap="round" strokeDasharray="2 2"/>
  </svg>
);

const ComponentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M8 8H16M8 12H16M8 16H12" strokeLinecap="round"/>
  </svg>
);

const AnalysisIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
    <path d="M12 16L16 12L12 8M8 12H16" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StepsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2L12 6M12 6L16 6M12 6L12 10M12 10L8 10M12 10L12 14M12 14L16 14M12 14L12 18M12 18L8 18M12 18L12 22"/>
    <path d="M8 6H16M8 14H16" strokeLinecap="round"/>
  </svg>
);

const MatrixIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M8 7V17M16 7V17M12 7V17M7 8H17M7 12H17M7 16H17" strokeLinecap="round"/>
  </svg>
);

const KCLIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12H16M12 8V16" strokeLinecap="round"/>
  </svg>
);

const SupernodeKCLIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="12" r="3"/>
    <circle cx="16" cy="12" r="3"/>
    <path d="M11 12H13" strokeLinecap="round"/>
    <path d="M5 12H8M16 12H19" strokeLinecap="round" strokeDasharray="2 2"/>
  </svg>
);

const ConstraintIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2V6M12 18V22M2 12H6M18 12H22" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M15 9L9 15" strokeLinecap="round"/>
  </svg>
);

const KeyPointIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="8"/>
    <path d="M12 8V12L14 14" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PowerAbsorbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" rx="2" strokeLinecap="round"/>
    <path d="M12 6V18M8 12H16" strokeLinecap="round"/>
    <path d="M6 8L8 6M18 16L16 18" strokeLinecap="round"/>
  </svg>
);

const PowerSupplyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" rx="2" strokeLinecap="round"/>
    <path d="M12 6V18M8 12H16" strokeLinecap="round"/>
    <path d="M6 16L8 18M18 8L16 6" strokeLinecap="round"/>
  </svg>
);

const PowerBalanceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2V6M12 18V22M2 12H6M18 12H22" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 8V16M8 12H16" strokeLinecap="round"/>
  </svg>
);

// ===== Helper Components =====
const PrefixSelector: React.FC<PrefixSelectorProps> = memo(({ selectedPrefix, onSelect }) => (
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
));

const ComponentCard: React.FC<ComponentCardProps> = memo(({ component, onDelete, onUpdate }) => {
  const handleDelete = () => onDelete(component.id);
  const handleUpdate = (field: keyof Component, value: string) => {
    onUpdate(component.id, { ...component, [field]: value });
  };

  return (
    <div className="component-card">
      <div className="card-header">
        <span className="comp-label">{component.type}</span>
        <button className="delete-btn" onClick={handleDelete} title="Remove Component">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
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
          <PrefixSelector selectedPrefix={component.prefix} onSelect={(prefix) => handleUpdate('prefix', prefix)} />
        </div>
      </div>
    </div>
  );
});

const ThemeToggle: React.FC<{ isDark: boolean; onToggle: () => void }> = memo(({ isDark, onToggle }) => (
  <button className="theme-toggle-btn" onClick={onToggle} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
    <div className="theme-toggle-icons">
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
));

// ===== Solution Components =====
const MatrixSolution: React.FC<{ matrixSolution?: MatrixSolution }> = memo(({ matrixSolution }) => {
  const formatMatrix = (matrix: number[][] | undefined, precision: number = 3) => {
    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
      return "\\text{Matrix not available}";
    }
    return matrix.map(row => 
      Array.isArray(row) ? row.map(val => val.toFixed(precision)).join(' & ') : ''
    ).join(' \\\\ ');
  };

  const formatVector = (vector: number[] | undefined, precision: number = 3) => {
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      return "\\text{Vector not available}";
    }
    return vector.map(val => val.toFixed(precision)).join(' \\\\ ');
  };

  if (!matrixSolution) {
    return (
      <section className="solution-section">
        <h2><MatrixIcon /> Matrix Solution</h2>
        <div className="matrix-solution">
          <p>Matrix solution data is not available.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="solution-section">
      <h2><MatrixIcon /> Matrix Solution</h2>
      
      <div className="matrix-solution">
        <div className="solution-method">
          <h4>Solution Method: {matrixSolution.solution_method || 'N/A'}</h4>
          {matrixSolution.steps && matrixSolution.steps.length > 0 && (
            <div className="method-steps">
              {matrixSolution.steps.map((step, index) => (
                <div key={index} className="method-step">
                  <span className="step-number">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="matrix-equations">
          <div className="matrix-group">
            <h5>Conductance Matrix [G]:</h5>
            <div className="equation-display">
              <LatexRenderer 
                content={`\\begin{bmatrix} ${formatMatrix(matrixSolution.conductance_matrix)} \\end{bmatrix}`} 
                displayMode={true} 
              />
            </div>
          </div>

          <div className="matrix-group">
            <h5>Current Vector [I]:</h5>
            <div className="equation-display">
              <LatexRenderer 
                content={`\\begin{bmatrix} ${formatVector(matrixSolution.current_vector)} \\end{bmatrix}`} 
                displayMode={true} 
              />
            </div>
          </div>

          <div className="matrix-group">
            <h5>Voltage Solution [V]:</h5>
            <div className="equation-display">
              <LatexRenderer 
                content={`\\begin{bmatrix} ${formatVector(matrixSolution.voltage_solution)} \\end{bmatrix}`} 
                displayMode={true} 
              />
            </div>
          </div>
        </div>

        {matrixSolution.verification && (
          <div className="verification">
            <h5>Solution Verification:</h5>
            <p>Maximum residual error: {matrixSolution.verification.max_error?.toExponential(3) || 'N/A'}</p>
            {matrixSolution.verification.max_error !== undefined && (
              <p className={matrixSolution.verification.max_error < 1e-9 ? 'verification-success' : 'verification-warning'}>
                {matrixSolution.verification.max_error < 1e-9 
                  ? '✓ Solution verified within numerical tolerance' 
                  : '⚠ Solution may have significant numerical error'}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
});

const VoltageResults: React.FC<{ voltages: { [node: number]: number } }> = memo(({ voltages }) => {
  const sortedNodes = Object.keys(voltages).map(Number).sort((a, b) => a - b);

  return (
    <section className="solution-section">
      <h2><CircuitIcon /> Node Voltages</h2>
      
      <div className="voltage-results">
        <div className="voltage-grid">
          {sortedNodes.map(node => (
            <div key={node} className="voltage-card">
              <div className="voltage-node">Node {node}</div>
              <div className="voltage-value">
                {voltages[node].toFixed(6)} V
                {node === 0 && <span className="reference-badge">GND</span>}
              </div>
            </div>
          ))}
        </div>
        
        <div className="voltage-convention">
          <h5>Voltage Reference:</h5>
          <p>All voltages are measured relative to the reference node (Node 0, GND).</p>
        </div>
      </div>
    </section>
  );
});

const ComponentResults: React.FC<{ components: ComponentResult[], totalPower: number }> = memo(({ 
  components, 
  totalPower 
}) => {
  const getPowerIcon = (power: number) => {
    if (Math.abs(power) < 1e-12) return <PowerBalanceIcon />;
    return power > 0 ? <PowerAbsorbIcon /> : <PowerSupplyIcon />;
  };

  const getPowerColor = (power: number) => {
    if (Math.abs(power) < 1e-12) return 'zero';
    return power > 0 ? 'absorbing' : 'supplying';
  };

  return (
    <section className="solution-section">
      <h2><ComponentIcon /> Component Analysis</h2>
      
      <div className="component-results">
        <div className="power-summary">
          <h4>Power Balance Summary</h4>
          <div className={`power-total ${getPowerColor(-totalPower)}`}>
            <span className="power-icon">{getPowerIcon(-totalPower)}</span>
            <span className="power-value">Total Power: {Math.abs(totalPower).toFixed(6)} W</span>
            <span className="power-type">
              {totalPower > 0 ? 'Net Power Absorption' : 'Net Power Delivery'}
            </span>
          </div>
          <div className={`balance-status ${Math.abs(totalPower) < 1e-9 ? 'balanced' : 'unbalanced'}`}>
            {Math.abs(totalPower) < 1e-9 
              ? '✓ Power balanced (within numerical tolerance)' 
              : '⚠ Power not perfectly balanced'}
          </div>
        </div>

        <div className="components-table-container">
          <table className="components-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Nodes</th>
                <th>Value</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Power (W)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp, index) => (
                <tr 
                  key={index} 
                  className={comp.type.toLowerCase()}
                >
                  <td>
                    <span className={`component-id ${comp.type.toLowerCase()}`}>
                      {comp.type === 'Resistor' ? 'R' : comp.type === 'VoltageSource' ? 'VS' : 'CS'}
                    </span>
                  </td>
                  <td className="component-nodes">
                    {comp.node1} → {comp.node2}
                  </td>
                  <td className="component-value">
                    {comp.value.toFixed(3)} 
                    {comp.type === 'Resistor' ? 'Ω' : comp.type === 'VoltageSource' ? 'V' : 'A'}
                  </td>
                  <td className="voltage">{comp.voltage.toFixed(6)}</td>
                  <td className="current">{comp.current.toFixed(6)}</td>
                  <td>
                    <div className="power-cell">
                      <span className="power-icon-small">{getPowerIcon(comp.power)}</span>
                      <span className={`power-value ${getPowerColor(comp.power)}`}>
                        {Math.abs(comp.power).toFixed(6)}
                      </span>
                    </div>
                  </td>
                  <td className="description">{comp.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="convention-explanation">
          <h5>Passive Sign Convention:</h5>
          <ul>
            <li><strong>Positive Power</strong>: Component is absorbing/dissipating power</li>
            <li><strong>Negative Power</strong>: Component is supplying/delivering power</li>
            <li><strong>Resistors</strong> should always have positive power (dissipation)</li>
            <li><strong>Sources</strong> typically have negative power (delivery)</li>
          </ul>
        </div>
      </div>
    </section>
  );
});

const SolutionRenderer: React.FC<{ solution: SolutionData }> = memo(({ solution }) => {
  const renderEquation = (equation: string) => {
    const latexMatch = equation.match(/\$(.*)\$/);
    if (latexMatch && latexMatch[1]) {
      return (
        <div className="equation-display">
          <LatexRenderer content={latexMatch[1]} displayMode={true} />
        </div>
      );
    }
    
    if (equation.includes('\\frac') || equation.includes('V_{') || equation.includes('_') || equation.includes('^')) {
      return (
        <div className="equation-display">
          <LatexRenderer content={equation} displayMode={true} />
        </div>
      );
    }
    
    return <div className="equation-display">{equation}</div>;
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'kcl': return <KCLIcon />;
      case 'supernode_kcl': return <SupernodeKCLIcon />;
      case 'constraint': return <ConstraintIcon />;
      default: return <AnalysisIcon />;
    }
  };

  return (
    <div className="solution-content">
      {/* Hero Section */}
      <section className="solution-section">
        <div className="circuit-title">
          <h1>{solution.overview.title}</h1>
          <p className="subtitle">{solution.overview.subtitle}</p>
          <p className="summary">{solution.overview.summary}</p>
        </div>
      </section>

      {/* Circuit Overview */}
      <section className="solution-section">
        <h2><CircuitIcon /> Circuit Overview</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{solution.circuitStatistics.totalNodes}</div>
            <div className="stat-label">Total Nodes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{solution.circuitStatistics.nonReferenceNodes.length}</div>
            <div className="stat-label">Non-Reference Nodes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{solution.circuitStatistics.supernodes.length}</div>
            <div className="stat-label">Supernodes</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{solution.circuitStatistics.components.total}</div>
            <div className="stat-label">Total Components</div>
          </div>
        </div>

        <div className="detailed-stats">
          <div className="stat-group">
            <h4><NodeIcon /> Node Information</h4>
            <p><strong>Reference Node:</strong> Node {solution.circuitStatistics.referenceNode} (GND)</p>
            <p><strong>Non-Reference Nodes:</strong> {solution.circuitStatistics.nonReferenceNodes.join(', ')}</p>
            {solution.circuitStatistics.supernodes.length > 0 && (
              <p><strong>Supernodes:</strong> {solution.circuitStatistics.supernodes.map(sn => `[${sn.join(', ')}]`).join(', ')}</p>
            )}
          </div>
          
          <div className="stat-group">
            <h4><ComponentIcon /> Component Breakdown</h4>
            <p><strong>Resistors:</strong> {solution.circuitStatistics.components.resistors}</p>
            <p><strong>Voltage Sources:</strong> {solution.circuitStatistics.components.voltageSources}</p>
            <p><strong>Current Sources:</strong> {solution.circuitStatistics.components.currentSources}</p>
          </div>
        </div>
      </section>

      {/* Components Section */}
      <section className="solution-section">
        <h2><ComponentIcon /> Circuit Components</h2>
        <div className="components-grid-detailed">
          {solution.components.map((comp, index) => (
            <div key={index} className="component-card-detailed">
              <div className="component-header">
                <span className="component-id">{comp.id}</span>
                <span className="component-type">{comp.type}</span>
              </div>
              <div className="component-details">
                <p><strong>Value:</strong> {comp.value}</p>
                <p><strong>Nodes:</strong> {comp.nodes}</p>
                <p><strong>Description:</strong> {comp.description}</p>
                {comp.currentFlow && <p><strong>Current Flow:</strong> {comp.currentFlow}</p>}
                {comp.constraint && <p><strong>Constraint:</strong> {comp.constraint}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Analysis Method */}
      <section className="solution-section">
        <h2><AnalysisIcon /> Analysis Method</h2>
        <div className="method-explanation">
          <h3>{solution.analysisMethod.name}</h3>
          <p>{solution.analysisMethod.description}</p>
          
          <div className="steps-container">
            <h4>Step-by-Step Process:</h4>
            <ol className="steps-list">
              {solution.analysisMethod.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="conventions">
            <h4>Circuit Conventions:</h4>
            <ul>
              <li><strong>Resistor:</strong> {solution.analysisMethod.conventions.Resistor}</li>
              <li><strong>Voltage Source:</strong> {solution.analysisMethod.conventions.VoltageSource}</li>
              <li><strong>Current Source:</strong> {solution.analysisMethod.conventions.CurrentSource}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Solution Steps */}
      <section className="solution-section">
        <h2><StepsIcon /> Step-by-Step Solution</h2>
        <div className="solution-steps">
          {solution.solutionSteps.map((step, index) => (
            <div key={index} className={`solution-step ${step.type}`}>
              <div className="step-header">
                <span className="step-icon">{getStepIcon(step.type)}</span>
                {step.stepNumber && <span className="step-number">Step {step.stepNumber}</span>}
                <h4>{step.title}</h4>
              </div>
              <p className="step-description">{step.description}</p>
              {renderEquation(step.equation)}
              <p className="step-explanation">{step.explanation}</p>
              {step.keyPoint && (
                <div className="key-point">
                  <KeyPointIcon />
                  <strong>Key Point:</strong> {step.keyPoint}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Matrix Formulation */}
      <section className="solution-section">
        <h2><MatrixIcon /> Matrix Formulation</h2>
        <div className="matrix-section">
          <p>{solution.matrixFormulation.description}</p>
          <div className="matrix-equation-improved">
            {renderEquation(solution.matrixFormulation.equation)}
          </div>
          <p>{solution.matrixFormulation.explanation}</p>
        </div>
      </section>

      {/* Numerical Solution */}
      {solution.numericalSolution && (
        <>
          <MatrixSolution matrixSolution={solution.numericalSolution.matrix_solution} />
          <VoltageResults voltages={solution.numericalSolution.voltages} />
          <ComponentResults 
            components={solution.numericalSolution.components} 
            totalPower={solution.numericalSolution.total_power} 
          />
        </>
      )}
    </div>
  );
});

// ===== Main Application Component =====
const App: React.FC = () => {
  const [components, setComponents] = useState<Component[]>(initialComponents);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [nextId, setNextId] = useState(4);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const UNMOUNT_DELAY_MS = 500;

  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuVisible(true);
    } else if (isMenuVisible) {
      const timer = setTimeout(() => setIsMenuVisible(false), UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen, isMenuVisible]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleAddComponent = useCallback(
    (type: string, unit: string) => {
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
      setComponents((prev) => [...prev, newComponent]);
      setNextId((prev) => prev + 1);
      setIsMenuOpen(false);
    },
    [components.length, nextId],
  );

  const handleDeleteComponent = useCallback((idToDelete: number) => {
    setComponents((prev) => prev.filter((c) => c.id !== idToDelete));
  }, []);

  const handleUpdateComponent = useCallback(
    (id: number, updatedComponent: Component) => {
      setComponents((prev) => prev.map((c) => (c.id === id ? updatedComponent : c)));
    },
    [],
  );

  const handleCleanAll = useCallback(() => {
    if (components.length === 0) return;
    setShowCleanConfirm(true);
  }, [components.length]);

  const handleConfirmClean = useCallback(() => {
    setComponents([]);
    setSolution(null);
    setShowCleanConfirm(false);
  }, []);

  const handleCancelClean = useCallback(() => {
    setShowCleanConfirm(false);
  }, []);

  const handleSolve = useCallback(async () => {
    if (components.length === 0) {
      alert('Please add at least one component to solve the circuit.');
      return;
    }
    setIsLoading(true);
    const circuitData = {
      components: components.map((comp) => {
        const typeMap: Record<string, string> = {
          Resistor: 'R',
          'Voltage Source': 'VS',
          'Current Source': 'CS',
        };
        return {
          type: typeMap[comp.type] || comp.type,
          value: parseFloat(comp.value) * getPrefixMultiplier(comp.prefix),
          nodeA: comp.nodeA,
          nodeB: comp.nodeB,
          unit: comp.unit,
        };
      }),
    };
    try {
      const response = await fetch('http://localhost:5000/api/solve-circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(circuitData),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      console.log('Backend response:', result); // Debug log

      if (result.success) {
        // Add validation for the matrix solution
        if (!result.solution?.matrix_solution) {
          console.warn('Matrix solution is missing from backend response');
        }
        
        const fullSolution: SolutionData = {
          ...result.analysis,
          numericalSolution: result.solution,
        };
        setSolution(fullSolution);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error analyzing circuit:', error);
      alert(`Error analyzing circuit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [components]);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((prev) => !prev);
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
            {components.map((comp) => (
              <ComponentCard
                key={comp.id}
                component={comp}
                onDelete={handleDeleteComponent}
                onUpdate={handleUpdateComponent}
              />
            ))}
          </div>
          <div className="action-buttons">
            <button className="action-button solve-btn" onClick={handleSolve} disabled={isLoading}>
              {isLoading ? 'Analyzing...' : 'Analyze Circuit'}
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
          </div>
          {/* Add Component Menu */}
          {isMenuVisible && (
            <div className={`menu-backdrop ${isClosing ? 'closing' : ''}`} onClick={() => setIsMenuOpen(false)}>
              <div className={`menu-popup ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
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
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Analyzing circuit...</p>
              </div>
            ) : solution ? (
              <ErrorBoundary>
                <SolutionRenderer solution={solution} />
              </ErrorBoundary>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <CircuitIcon />
                </div>
                <h3>No Analysis Yet</h3>
                <p>Click "Analyze Circuit" to see the step-by-step circuit analysis and equations.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCleanConfirm && (
        <div className="modal-backdrop" onClick={handleCancelClean}>
          <div className="modal-popup" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Clean All</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete all {components.length} components?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="action-button cancel-btn" 
                onClick={handleCancelClean}
              >
                Cancel
              </button>
              <button 
                className="action-button confirm-btn" 
                onClick={handleConfirmClean}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;