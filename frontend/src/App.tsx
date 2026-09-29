import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Communities } from './pages/Communities';
import { CommunityDetail } from './pages/CommunityDetail';
import { CreateCommunity } from './pages/CreateCommunity';
import { CaseDetail } from './pages/CaseDetail';
import { HowItWorks } from './pages/HowItWorks';
import { NotFound } from './pages/NotFound';
import { DevPreview } from './pages/DevPreview';

export function App() {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/" element={<Home />} />
				<Route path="/communities" element={<Communities />} />
				<Route path="/communities/new" element={<CreateCommunity />} />
				<Route path="/communities/:communityId" element={<CommunityDetail />} />
				<Route path="/cases/:caseId" element={<CaseDetail />} />
				<Route path="/how-it-works" element={<HowItWorks />} />
				<Route path="/dev-preview" element={<DevPreview />} />
				<Route path="*" element={<NotFound />} />
			</Route>
		</Routes>
	);
}
