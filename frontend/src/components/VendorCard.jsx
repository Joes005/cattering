import { Link } from 'react-router-dom';

export default function VendorCard({ vendor }) {
  return (
    <Link to={`/vendors/${vendor.id}`} className="vendor-card">
      <div className="body">
        <h3>{vendor.business_name}</h3>
        <p className="muted">{vendor.city || 'Location not set'}</p>
        <p className="muted">{vendor.cuisine_types}</p>
        <p className="price">
          ₹{vendor.price_per_plate_min}–₹{vendor.price_per_plate_max} / plate
        </p>
        {vendor.rating_count > 0 && (
          <span className="badge gold">
            ⭐ {vendor.avg_rating.toFixed(1)} ({vendor.rating_count})
          </span>
        )}
        {vendor.is_verified && <span className="badge">Verified</span>}
      </div>
    </Link>
  );
}
