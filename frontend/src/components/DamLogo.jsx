export default function DamLogo({ compact = false }) {
  return (
    <div className={`dam-logo ${compact ? 'dam-logo--compact' : ''}`}>
      <div className="dam-logo__mark">
        <img src="/DAM.png" alt="Logo DAM" className="dam-logo__image" />
      </div>

      {!compact && (
        <div className="dam-logo__copy">
          <span>DAM</span>
          <small>Estética y barbería</small>
        </div>
      )}
    </div>
  );
}
