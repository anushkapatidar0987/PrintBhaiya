const fs = require('fs');

let content = fs.readFileSync('/Users/anushkapatidar/Documents/printkardobhaiya/LandingPage.tsx', 'utf8');

// Remove typescript imports
content = content.replace(/import \{ Shop, Order \} from '\.\.\/types';\n/g, "");
content = content.replace(/import \{ calculatePrintCost \} from '\.\.\/mockData';\n/g, "");

// Change export default function LandingPage
content = content.replace(/interface LandingPageProps[\s\S]*?\}/g, "");
content = content.replace(/export default function LandingPage\(\{[\s\S]*?\}\: LandingPageProps\) \{/g, `import { useNavigate } from 'react-router-dom';
import { shopService } from '../services/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const [shops, setShops] = React.useState([]);
  
  React.useEffect(() => {
    shopService.getPublicList()
      .then(res => setShops(res.data.results || res.data))
      .catch(err => console.error("Failed to fetch shops", err));
  }, []);

  const onEnterPortal = (role) => {
    if (role === 'student') navigate('/auth?mode=register');
    else if (role === 'shopkeeper') navigate('/auth?mode=login');
    else if (role === 'admin') navigate('/superadmin');
  };

  const calculatePrintCost = (pages, copies, type, sides, shop) => {
    if (!shop || !shop.price_list) return 0;
    const pl = shop.price_list;
    let pageRate = type === 'color' ? pl.color_rate_per_page : pl.bw_rate_per_page;
    if (sides === 'double' && pl.double_sided_supported && pl.double_sided_rate_per_page) {
       pageRate = pl.double_sided_rate_per_page;
    }
    const baseCost = pages * copies * pageRate;
    return baseCost < pl.minimum_order_amount ? pl.minimum_order_amount : baseCost;
  };
`);

// Strip typescript types
content = content.replace(/useState\<'bw' \| 'color'\>/g, "useState");
content = content.replace(/useState\<'single' \| 'double'\>/g, "useState");
content = content.replace(/useState\<Order \| null\>/g, "useState");
content = content.replace(/\(e\: React\.FormEvent\)/g, "(e)");

// Orders is not passed, so we can't track order in landing page
content = content.replace(/orders\.find/g, "([]).find");

fs.writeFileSync('/Users/anushkapatidar/Documents/printkardobhaiya/frontend/src/pages/LandingPage.jsx', content);

