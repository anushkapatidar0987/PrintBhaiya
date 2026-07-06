import re

with open('/Users/anushkapatidar/Documents/printkardobhaiya/LandingPage.tsx', 'r') as f:
    content = f.read()

# Remove typescript imports
content = re.sub(r"import \{ Shop, Order \} from '\.\./types';\n", "", content)
content = re.sub(r"import \{ calculatePrintCost \} from '\.\./mockData';\n", "", content)

# Change export default function LandingPage
content = re.sub(r"interface LandingPageProps.*?\}", "", content, flags=re.DOTALL)
content = re.sub(r"export default function LandingPage\(\{.*?\}\: LandingPageProps\) \{", """import { useNavigate } from 'react-router-dom';
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
""", content, flags=re.DOTALL)

# Strip typescript types
content = re.sub(r"useState<'bw' \| 'color'>", "useState", content)
content = re.sub(r"useState\<'single' \| 'double'\>", "useState", content)
content = re.sub(r"useState\<Order \| null\>", "useState", content)
content = re.sub(r"\(e\: React\.FormEvent\)", "(e)", content)

# Orders is not passed, so we can't track order in landing page
content = content.replace("orders.find", "([]).find")

with open('/Users/anushkapatidar/Documents/printkardobhaiya/frontend/src/pages/LandingPage.jsx', 'w') as f:
    f.write(content)

