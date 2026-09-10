export default function PackageCard({ pkg, action }) {
  return (
    <div className="package-card">
      <div className="body">
        <h3>{pkg.title}</h3>
        <p className="muted">{pkg.description}</p>
        <p className="muted">
          {pkg.min_guests}–{pkg.max_guests} guests
        </p>
        {pkg.menu_items && <p className="muted">Menu: {pkg.menu_items}</p>}
        <p className="price">₹{pkg.price_per_plate} / plate</p>
        {action}
      </div>
    </div>
  );
}
