import { Link } from 'react-router-dom';

export function NotFound() {
	return (
		<div className="fm-empty">
			<h1>Page not found</h1>
			<Link to="/">Return home</Link>
		</div>
	);
}
