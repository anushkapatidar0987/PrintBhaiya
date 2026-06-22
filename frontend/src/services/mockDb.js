// Local Mock Database Layer for PrintKarDoBhaiya using localStorage

const DEFAULT_USERS = [
  {
    id: "u-admin",
    name: "Platform Admin",
    email: "admin@example.com",
    password: "admin123",
    role: "admin",
    phone: "+91 9876543210"
  },
  {
    id: "u-student",
    name: "Anushka Patidar",
    email: "student@example.com",
    password: "student123",
    role: "student",
    phone: "+91 9898989898"
  },
  {
    id: "u-shopkeeper-1",
    name: "Ramesh Kumar",
    email: "sai@example.com",
    password: "shop123",
    role: "shopkeeper",
    phone: "+91 9111223344",
    shopId: "shop-1"
  },
  {
    id: "u-shopkeeper-2",
    name: "Suresh Sharma",
    email: "campus@example.com",
    password: "shop123",
    role: "shopkeeper",
    phone: "+91 9222334455",
    shopId: "shop-2"
  }
];

const DEFAULT_SHOPS = [
  {
    id: "shop-1",
    ownerId: "u-shopkeeper-1",
    name: "Sai Xerox & Prints",
    slug: "sai-xerox-prints",
    address: "Opposite College Main Gate, Sector 4",
    city: "Indore",
    area: "Vijay Nagar",
    phone: "+91 9111223344",
    status: "OPEN", // OPEN, CLOSED, HOLIDAY
    isApproved: true,
    pricePerBw: 2, // Rs 2 per page
    pricePerColor: 10, // Rs 10 per page
    bindingOptions: [
      { id: "b1", name: "Spiral Binding", price: 30, active: true },
      { id: "b2", name: "Stapled", price: 5, active: true }
    ],
    statusUpdatedAt: new Date().toISOString()
  },
  {
    id: "shop-2",
    ownerId: "u-shopkeeper-2",
    name: "Campus Digital Copy Center",
    slug: "campus-copy-center",
    address: "Hostel Block B Market, University Campus",
    city: "Indore",
    area: "University Area",
    phone: "+91 9222334455",
    status: "OPEN",
    isApproved: true,
    pricePerBw: 1.5,
    pricePerColor: 8,
    bindingOptions: [
      { id: "b1", name: "Spiral Binding", price: 25, active: true },
      { id: "b3", name: "Hardcover Binding", price: 100, active: true },
      { id: "b2", name: "Stapled", price: 2, active: true }
    ],
    statusUpdatedAt: new Date().toISOString()
  },
  {
    id: "shop-3",
    ownerId: "u-shopkeeper-3",
    name: "Bhaiya Prints",
    slug: "bhaiya-prints",
    address: "Back Gate Lane, near Library",
    city: "Indore",
    area: "Vijay Nagar",
    phone: "+91 9333445566",
    status: "CLOSED",
    isApproved: true,
    pricePerBw: 2.5,
    pricePerColor: 12,
    bindingOptions: [
      { id: "b1", name: "Spiral Binding", price: 35, active: true }
    ],
    statusUpdatedAt: new Date().toISOString()
  }
];

const DEFAULT_ORDERS = [
  {
    id: "order-1",
    orderNumber: "PKB-20260620-0001",
    studentId: "u-student",
    studentName: "Anushka Patidar",
    shopId: "shop-1",
    shopName: "Sai Xerox & Prints",
    fileName: "operating_systems_assignment.pdf",
    fileSize: "2.4 MB",
    printType: "bw", // bw, color
    copies: 2,
    pageCount: 15,
    doubleSided: true,
    bindingOption: "Spiral Binding",
    bindingPrice: 30,
    studentComment: "Double sided and spiral binding please. Urgent!",
    calculatedPrice: 90, // (15 pages * Rs 2 * 2 copies) + 30 binding
    status: "COLLECTED", // PENDING_PAYMENT, PLACED, ACCEPTED, PRINTING, READY, COLLECTED, REJECTED
    createdAt: "2026-06-20T10:15:30Z",
    updatedAt: "2026-06-20T11:45:00Z"
  },
  {
    id: "order-2",
    orderNumber: "PKB-20260620-0002",
    studentId: "u-student",
    studentName: "Anushka Patidar",
    shopId: "shop-2",
    shopName: "Campus Digital Copy Center",
    fileName: "resume_final.pdf",
    fileSize: "820 KB",
    printType: "color",
    copies: 5,
    pageCount: 1,
    doubleSided: false,
    bindingOption: "None",
    bindingPrice: 0,
    studentComment: "Need thick glossy paper if possible.",
    calculatedPrice: 40, // (1 page * Rs 8 * 5 copies)
    status: "READY",
    createdAt: "2026-06-20T16:20:00Z",
    updatedAt: "2026-06-20T16:45:00Z"
  }
];

// Helper to initialize localStorage
const initDb = () => {
  if (!localStorage.getItem("pkb_initialized")) {
    localStorage.setItem("pkb_users", JSON.stringify(DEFAULT_USERS));
    localStorage.setItem("pkb_shops", JSON.stringify(DEFAULT_SHOPS));
    localStorage.setItem("pkb_orders", JSON.stringify(DEFAULT_ORDERS));
    localStorage.setItem("pkb_initialized", "true");
  }
};

// Execute initialization
initDb();

const getStorageItem = (key) => JSON.parse(localStorage.getItem(key));
const setStorageItem = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export const mockDb = {
  // --- AUTH SERVICES ---
  getCurrentUser: () => {
    return getStorageItem("pkb_currentUser") || null;
  },

  loginUser: (email, password) => {
    const users = getStorageItem("pkb_users");
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      throw new Error("Invalid email or password");
    }
    setStorageItem("pkb_currentUser", user);
    return user;
  },

  logoutUser: () => {
    localStorage.removeItem("pkb_currentUser");
  },

  registerUser: (name, email, phone, role, password, shopDetails = null) => {
    const users = getStorageItem("pkb_users");
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already registered");
    }

    const userId = "u-" + Date.now();
    const newUser = { id: userId, name, email, phone, role, password };

    if (role === "shopkeeper" && shopDetails) {
      const shops = getStorageItem("pkb_shops");
      const shopId = "shop-" + Date.now();
      const slug = shopDetails.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      const newShop = {
        id: shopId,
        ownerId: userId,
        name: shopDetails.name,
        slug,
        address: shopDetails.address,
        city: shopDetails.city || "Indore",
        area: shopDetails.area || "Vijay Nagar",
        phone: phone,
        status: "CLOSED",
        isApproved: false, // requires admin approval
        pricePerBw: parseFloat(shopDetails.pricePerBw) || 2.0,
        pricePerColor: parseFloat(shopDetails.pricePerColor) || 10.0,
        bindingOptions: [
          { id: "b1", name: "Spiral Binding", price: 30, active: true },
          { id: "b2", name: "Stapled", price: 5, active: true }
        ],
        statusUpdatedAt: new Date().toISOString()
      };
      
      shops.push(newShop);
      setStorageItem("pkb_shops", shops);
      newUser.shopId = shopId;
    }

    users.push(newUser);
    setStorageItem("pkb_users", users);
    
    // Automatically log in the user (except admin approval required note for shopkeeper)
    if (role !== "shopkeeper") {
      setStorageItem("pkb_currentUser", newUser);
    }
    
    return newUser;
  },

  // --- SHOP SERVICES ---
  getShops: (onlyApproved = true) => {
    const shops = getStorageItem("pkb_shops");
    return onlyApproved ? shops.filter(s => s.isApproved) : shops;
  },

  getShopById: (id) => {
    const shops = getStorageItem("pkb_shops");
    return shops.find(s => s.id === id) || null;
  },

  getShopByOwnerId: (ownerId) => {
    const shops = getStorageItem("pkb_shops");
    return shops.find(s => s.ownerId === ownerId) || null;
  },

  updateShopStatus: (shopId, status) => {
    const shops = getStorageItem("pkb_shops");
    const shopIndex = shops.findIndex(s => s.id === shopId);
    if (shopIndex !== -1) {
      shops[shopIndex].status = status;
      shops[shopIndex].statusUpdatedAt = new Date().toISOString();
      setStorageItem("pkb_shops", shops);
      return shops[shopIndex];
    }
    throw new Error("Shop not found");
  },

  updateShopPricing: (shopId, pricePerBw, pricePerColor, bindingOptions) => {
    const shops = getStorageItem("pkb_shops");
    const shopIndex = shops.findIndex(s => s.id === shopId);
    if (shopIndex !== -1) {
      shops[shopIndex].pricePerBw = parseFloat(pricePerBw);
      shops[shopIndex].pricePerColor = parseFloat(pricePerColor);
      if (bindingOptions) {
        shops[shopIndex].bindingOptions = bindingOptions;
      }
      setStorageItem("pkb_shops", shops);
      return shops[shopIndex];
    }
    throw new Error("Shop not found");
  },

  approveShop: (shopId) => {
    const shops = getStorageItem("pkb_shops");
    const shopIndex = shops.findIndex(s => s.id === shopId);
    if (shopIndex !== -1) {
      shops[shopIndex].isApproved = true;
      setStorageItem("pkb_shops", shops);
      return shops[shopIndex];
    }
    throw new Error("Shop not found");
  },

  // --- ORDER SERVICES ---
  getOrders: () => {
    return getStorageItem("pkb_orders") || [];
  },

  getOrdersByStudent: (studentId) => {
    const orders = getStorageItem("pkb_orders") || [];
    return orders.filter(o => o.studentId === studentId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getOrdersByShop: (shopId) => {
    const orders = getStorageItem("pkb_orders") || [];
    return orders.filter(o => o.shopId === shopId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getOrderById: (id) => {
    const orders = getStorageItem("pkb_orders") || [];
    return orders.find(o => o.id === id) || null;
  },

  createOrder: (studentId, shopId, orderDetails) => {
    const orders = getStorageItem("pkb_orders") || [];
    const shops = getStorageItem("pkb_shops") || [];
    const users = getStorageItem("pkb_users") || [];
    
    const shop = shops.find(s => s.id === shopId);
    const student = users.find(u => u.id === studentId);
    
    if (!shop) throw new Error("Shop not found");
    if (shop.status !== "OPEN") throw new Error("This print shop is currently closed");
    
    const pageRate = orderDetails.printType === "color" ? shop.pricePerColor : shop.pricePerBw;
    const baseCost = orderDetails.pageCount * orderDetails.copies * pageRate;
    
    let bindingPrice = 0;
    if (orderDetails.bindingOption && orderDetails.bindingOption !== "None") {
      const option = shop.bindingOptions.find(b => b.name === orderDetails.bindingOption);
      if (option) bindingPrice = option.price;
    }
    
    const calculatedPrice = baseCost + bindingPrice;
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const dailySeq = String(orders.filter(o => o.createdAt.startsWith(new Date().toISOString().slice(0, 10))).length + 1).padStart(4, "0");
    const orderNumber = `PKB-${dateStr}-${dailySeq}`;
    
    const newOrder = {
      id: "order-" + Date.now(),
      orderNumber,
      studentId,
      studentName: student ? student.name : "Student",
      shopId,
      shopName: shop.name,
      fileName: orderDetails.fileName || "document.pdf",
      fileSize: orderDetails.fileSize || "1.0 MB",
      printType: orderDetails.printType,
      copies: parseInt(orderDetails.copies) || 1,
      pageCount: parseInt(orderDetails.pageCount) || 1,
      doubleSided: orderDetails.doubleSided || false,
      bindingOption: orderDetails.bindingOption || "None",
      bindingPrice,
      studentComment: orderDetails.studentComment || "",
      calculatedPrice,
      status: "PENDING_PAYMENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    setStorageItem("pkb_orders", orders);
    return newOrder;
  },

  updateOrderStatus: (orderId, status, comment = "") => {
    const orders = getStorageItem("pkb_orders") || [];
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex !== -1) {
      orders[orderIndex].status = status;
      orders[orderIndex].updatedAt = new Date().toISOString();
      if (status === "REJECTED" && comment) {
        orders[orderIndex].shopRejectionReason = comment;
      }
      setStorageItem("pkb_orders", orders);
      return orders[orderIndex];
    }
    throw new Error("Order not found");
  },

  // --- STATS SERVICES (Super Admin) ---
  getStats: () => {
    const orders = getStorageItem("pkb_orders") || [];
    const shops = getStorageItem("pkb_shops") || [];
    const users = getStorageItem("pkb_users") || [];
    
    const completedOrders = orders.filter(o => o.status === "COLLECTED");
    const paidOrders = orders.filter(o => o.status !== "PENDING_PAYMENT" && o.status !== "REJECTED");
    const totalGmv = paidOrders.reduce((sum, o) => sum + o.calculatedPrice, 0);
    
    return {
      totalGmv,
      totalOrdersCount: orders.length,
      paidOrdersCount: paidOrders.length,
      completedOrdersCount: completedOrders.length,
      shopsCount: shops.length,
      studentsCount: users.filter(u => u.role === "student").length,
      pendingShopsCount: shops.filter(s => !s.isApproved).length
    };
  }
};
