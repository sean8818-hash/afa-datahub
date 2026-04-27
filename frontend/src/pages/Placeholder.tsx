import './Placeholder.css';

interface Props {
  title: string;
  description: string;
  icon: string;
}

export function Placeholder({ title, description, icon }: Props) {
  return (
    <div className="placeholder">
      <div className="placeholder-icon" aria-hidden="true">{icon}</div>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-desc">{description}</p>
      <span className="placeholder-badge">Coming next</span>
    </div>
  );
}
