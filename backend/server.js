const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "Prompt_Mert";
const jwtSecret = process.env.JWT_SECRET || "secret";
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_SQHLLEV5FDWHor";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "bocNb5CJgijW795LHBuytf6w";
const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const normalizeShopName = (value = "") => String(value || "").trim();
const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
};
const parseTypes = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
};
const isVideoCategory = (value = "") => /video/i.test(String(value || ""));

const client = new MongoClient(uri);
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = (file.originalname || "file").replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  }
});
const pdfUpload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });
const zipUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const maybePdfSingle = (field) => (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return pdfUpload.single(field)(req, res, next);
  }
  return next();
};
const maybeImageSingle = (field) => (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return imageUpload.single(field)(req, res, next);
  }
  return next();
};
const maybeImageArray = (field, max) => (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return imageUpload.array(field, max)(req, res, next);
  }
  return next();
};
const maybeZipSingle = (field) => (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return zipUpload.single(field)(req, res, next);
  }
  return next();
};
const maybeProductFiles = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return multer({ storage, limits: { fileSize: 180 * 1024 * 1024 } }).fields([
      { name: "images", maxCount: 6 },
      { name: "videos", maxCount: 1 },
      { name: "poster", maxCount: 1 },
      { name: "zipFile", maxCount: 1 }
    ])(req, res, next);
  }
  return next();
};
const maybeSettingsAssets = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return multer({ storage, limits: { fileSize: 120 * 1024 * 1024 } }).fields([
      { name: "heroImage", maxCount: 1 },
      { name: "heroVideo", maxCount: 1 }
    ])(req, res, next);
  }
  return next();
};
const fileUrl = (req, file) =>
  file ? `${req.protocol}://${req.get("host")}/uploads/${file.filename}` : "";
const saveWebpImage = async (req, file) => {
  if (!file || !file.buffer) return "";
  const baseName = (path.parse(file.originalname || "image").name || "image").replace(/\s+/g, "-");
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}.webp`;
  const outputPath = path.join(uploadDir, filename);
  await sharp(file.buffer).webp({ quality: 95 }).toFile(outputPath);
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};
const getUploadPath = (url) => {
  if (!url || typeof url !== "string" || !url.includes("/uploads/")) return null;
  try {
    const pathname = new URL(url).pathname || "";
    if (!pathname.includes("/uploads/")) return null;
    const rel = pathname.split("/uploads/")[1];
    return rel ? path.join(uploadDir, rel) : null;
  } catch {
    const rel = url.split("/uploads/")[1];
    return rel ? path.join(uploadDir, rel) : null;
  }
};
const deleteUpload = async (url) => {
  const filePath = getUploadPath(url);
  if (!filePath || !fs.existsSync(filePath)) return;
  await fs.promises.unlink(filePath).catch(() => {});
};
const convertImageFileToWebp = async (req, file) => {
  if (!file?.path) return "";
  const baseName = (path.parse(file.originalname || file.filename || "image").name || "image").replace(/\s+/g, "-");
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}.webp`;
  const outputPath = path.join(uploadDir, filename);
  await sharp(file.path).webp({ quality: 92 }).toFile(outputPath);
  await fs.promises.unlink(file.path).catch(() => {});
  return `${req.protocol}://${req.get("host")}/uploads/${filename}`;
};
let isConnected = false;

app.use("/uploads", express.static(uploadDir));

const getDb = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    const db = client.db(dbName);
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("users").createIndex(
        { shopNameLower: 1 },
        { unique: true, partialFilterExpression: { shopNameLower: { $type: "string", $ne: "" } } }
      ),
      db.collection("products").createIndex({ status: 1, createdAt: -1 }),
      db.collection("products").createIndex({ sellerId: 1, createdAt: -1 }),
      db.collection("purchases").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("purchases").createIndex({ productId: 1, userId: 1 }),
      db.collection("purchases").createIndex({ sellerId: 1, createdAt: -1 })
    ]).catch(() => {});
    return db;
  }
  return client.db(dbName);
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = {
      ...payload,
      role: payload.role || "buyer"
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const requireBuyer = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "buyer") return res.status(403).json({ message: "Buyer access required" });
  return next();
};

const requireSeller = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "seller") return res.status(403).json({ message: "Seller access required" });
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  return next();
};

const adminMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!name || !normalizedEmail || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  const db = await getDb();
  const existing = await db.collection("users").find({ email: normalizedEmail }).toArray();
  if (existing.length) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection("users").insertOne({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: "buyer",
    shopName: "",
    shopNameLower: "",
    paid: false,
    paidUntil: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return res.json({ message: "Buyer signup successful" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return res.status(400).json({ message: "Missing credentials" });
  const db = await getDb();
  const users = await db.collection("users").find({ email: normalizedEmail }).toArray();
  const user = users[0];
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const effectiveRole = user.role || "buyer";
  if (effectiveRole !== "buyer") {
    return res.status(403).json({ message: "Use seller login for seller accounts" });
  }
  const passwordHash = user.passwordHash || user.password || "";
  const match = await bcrypt.compare(password, passwordHash);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });
  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        role: effectiveRole,
        email: normalizedEmail,
        updatedAt: new Date()
      }
    }
  );
  const token = jwt.sign(
    { id: String(user._id), email: normalizedEmail, role: effectiveRole, shopName: user.shopName || "" },
    jwtSecret,
    { expiresIn: "7d" }
  );
  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: normalizedEmail,
      role: effectiveRole,
      shopName: user.shopName || "",
      paid: !!user.paid,
      paidUntil: user.paidUntil || null
    }
  });
});

app.post("/api/seller/signup", async (req, res) => {
  const { name, email, password, confirmPassword, shopName } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedShopName = normalizeShopName(shopName);
  if (!name || !normalizedEmail || !password || !confirmPassword || !normalizedShopName) {
    return res.status(400).json({ message: "All fields required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }
  const db = await getDb();
  const shopNameLower = normalizedShopName.toLowerCase();
  const [emailUser, shopUser] = await Promise.all([
    db.collection("users").find({ email: normalizedEmail }).toArray(),
    db.collection("users").find({ shopNameLower }).toArray()
  ]);
  if (emailUser.length) return res.status(409).json({ message: "Email already registered" });
  if (shopUser.length) return res.status(409).json({ message: "Shop name already exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection("users").insertOne({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: "seller",
    shopName: normalizedShopName,
    shopNameLower,
    paid: false,
    paidUntil: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return res.json({ message: "Seller signup successful" });
});

app.post("/api/seller/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return res.status(400).json({ message: "Missing credentials" });
  const db = await getDb();
  const users = await db.collection("users").find({ email: normalizedEmail }).toArray();
  const user = users[0];
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const effectiveRole = user.role || "buyer";
  if (effectiveRole !== "seller") {
    return res.status(403).json({ message: "Use buyer login for buyer accounts" });
  }
  const passwordHash = user.passwordHash || user.password || "";
  const match = await bcrypt.compare(password, passwordHash);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });
  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        role: "seller",
        email: normalizedEmail,
        shopNameLower: normalizeShopName(user.shopName || "").toLowerCase(),
        updatedAt: new Date()
      }
    }
  );
  const token = jwt.sign(
    { id: String(user._id), email: normalizedEmail, role: "seller", shopName: user.shopName || "" },
    jwtSecret,
    { expiresIn: "7d" }
  );
  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: normalizedEmail,
      role: "seller",
      shopName: user.shopName || ""
    }
  });
});

app.post("/api/admin/login", async (req, res) => {
  const { adminId, password } = req.body;
  if (adminId !== process.env.ADMIN_ID || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }
  const token = jwt.sign({ role: "admin" }, jwtSecret, { expiresIn: "12h" });
  return res.json({ token });
});

const createListing = (collection) => async (req, res) => {
  const payload = { ...req.body, status: "pending", createdAt: new Date(), userId: req.user.id };
  const db = await getDb();
  await db.collection(collection).insertOne(payload);
  return res.json({ message: "Submitted" });
};

const listItems = (collection) => async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const db = await getDb();
  const items = await db.collection(collection).find(query).sort({ createdAt: -1 }).toArray();
  return res.json(items);
};

const approveItem = (collection) => async (req, res) => {
  const db = await getDb();
  await db.collection(collection).updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "approved", approvedAt: new Date() } }
  );
  return res.json({ message: "Approved" });
};

const deleteItem = (collection) => async (req, res) => {
  const db = await getDb();
  await db.collection(collection).deleteOne({ _id: new ObjectId(req.params.id) });
  return res.json({ message: "Deleted" });
};

app.get("/api/jobs", listItems("jobs"));
app.post("/api/jobs", authMiddleware, createListing("jobs"));
app.put("/api/jobs/:id/approve", adminMiddleware, approveItem("jobs"));
app.delete("/api/jobs/:id", adminMiddleware, deleteItem("jobs"));

app.get("/api/properties", listItems("properties"));
app.post("/api/properties", authMiddleware, createListing("properties"));
app.put("/api/properties/:id/approve", adminMiddleware, approveItem("properties"));
app.delete("/api/properties/:id", adminMiddleware, deleteItem("properties"));

app.get("/api/pets", listItems("pets"));
app.post("/api/pets", authMiddleware, createListing("pets"));
app.put("/api/pets/:id/approve", adminMiddleware, approveItem("pets"));
app.delete("/api/pets/:id", adminMiddleware, deleteItem("pets"));

app.get("/api/categories", async (req, res) => {
  const db = await getDb();
  const items = await db.collection("categories").find({}).toArray();
  return res.json(items);
});

app.post("/api/categories", adminMiddleware, maybeImageSingle("icon"), async (req, res) => {
  const db = await getDb();
  const iconUrl = (await saveWebpImage(req, req.file)) || (req.body.iconUrl || "");
  const types = parseTypes(req.body.types);
  const payload = {
    name: req.body.name,
    description: req.body.description || "",
    iconUrl,
    iconData: "",
    types,
    createdAt: new Date()
  };
  const result = await db.collection("categories").insertOne(payload);
  return res.json({ message: "Category added", item: { ...payload, _id: result.insertedId } });
});

app.delete("/api/categories/:id", adminMiddleware, async (req, res) => {
  const db = await getDb();
  await db.collection("categories").deleteOne({ _id: new ObjectId(req.params.id) });
  return res.json({ message: "Category deleted" });
});

app.put("/api/categories/:id", adminMiddleware, maybeImageSingle("icon"), async (req, res) => {
  const db = await getDb();
  const existing = await db.collection("categories").find({ _id: new ObjectId(req.params.id) }).toArray();
  const current = existing[0] || {};
  const iconUrl = (await saveWebpImage(req, req.file)) || req.body.iconUrl || current.iconUrl || "";
  const types = parseTypes(req.body.types);
  await db.collection("categories").updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $set: {
        name: req.body.name,
        description: req.body.description || "",
        iconUrl,
        iconData: "",
        types,
        updatedAt: new Date()
      }
    }
  );
  return res.json({ message: "Category updated" });
});

const buildProductQuery = (query) => {
  const and = [];
  const { status, category, type, search } = query || {};
  if (status) and.push({ status });
  if (category) and.push({ category: { $regex: `^${escapeRegex(category)}$`, $options: "i" } });
  if (type) and.push({ type: { $regex: `^${escapeRegex(type)}$`, $options: "i" } });
  if (search) {
    and.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } }
      ]
    });
  }
  return and.length ? { $and: and } : {};
};

app.get("/api/posts", async (req, res) => {
  const db = await getDb();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "6", 10)));
  const query = buildProductQuery(req.query);
  const total = await db.collection("posts").countDocuments(query);
  const items = await db
    .collection("posts")
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  return res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

app.get("/api/products", async (req, res) => {
  const db = await getDb();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "6", 10)));
  const query = buildProductQuery(req.query);
  const total = await db.collection("posts").countDocuments(query);
  const items = await db
    .collection("posts")
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  return res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

app.get("/api/posts/:id", async (req, res) => {
  const db = await getDb();
  const item = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!item) return res.status(404).json({ message: "Not found" });
  return res.json(item);
});

app.get("/api/products/:id", async (req, res) => {
  const db = await getDb();
  const item = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!item) return res.status(404).json({ message: "Not found" });
  return res.json(item);
});


app.get("/api/admin/posts/:id/details", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const posts = await db.collection("posts").find({ _id: new ObjectId(req.params.id) }).toArray();
  const post = posts[0];
  if (!post) return res.status(404).json({ message: "Not found" });
  let user = null;
  if (post.userId && ObjectId.isValid(post.userId)) {
    const users = await db.collection("users").find({ _id: new ObjectId(post.userId) }).toArray();
    user = users[0]
      ? { name: users[0].name, email: users[0].email, paid: !!users[0].paid, paidUntil: users[0].paidUntil || null }
      : null;
  }
  if (!user && post.userEmail) {
    const users = await db.collection("users").find({ email: post.userEmail }).toArray();
    user = users[0]
      ? { name: users[0].name, email: users[0].email, paid: !!users[0].paid, paidUntil: users[0].paidUntil || null }
      : null;
  }
  if (!user && post.sellerId && ObjectId.isValid(post.sellerId)) {
    const users = await db.collection("users").find({ _id: new ObjectId(post.sellerId) }).toArray();
    user = users[0]
      ? { name: users[0].name, email: users[0].email, paid: !!users[0].paid, paidUntil: users[0].paidUntil || null }
      : null;
  }
  if (!user && post.sellerEmail) {
    const users = await db.collection("users").find({ email: post.sellerEmail }).toArray();
    user = users[0]
      ? { name: users[0].name, email: users[0].email, paid: !!users[0].paid, paidUntil: users[0].paidUntil || null }
      : null;
  }
  return res.json({ post, user });
});

app.get("/api/my-posts", authMiddleware, async (req, res) => {
  const db = await getDb();
  if ((req.user.role || "buyer") !== "seller") {
    return res.status(403).json({ message: "Seller access required" });
  }
  const items = await db.collection("posts").find({
    $or: [{ sellerEmail: req.user.email }, { sellerId: req.user.id }, { userEmail: req.user.email }, { userId: req.user.id }]
  }).sort({ createdAt: -1 }).toArray();
  return res.json(items);
});

app.get("/api/my-products", authMiddleware, requireSeller, async (req, res) => {
  const db = await getDb();
  const items = await db.collection("posts").find({
    $or: [{ sellerEmail: req.user.email }, { sellerId: req.user.id }, { userEmail: req.user.email }, { userId: req.user.id }]
  }).sort({ createdAt: -1 }).toArray();
  return res.json(items);
});

app.post("/api/posts", authMiddleware, requireSeller, maybeProductFiles, async (req, res) => {
  const db = await getDb();
  const users = await db.collection("users").find({ _id: new ObjectId(req.user.id) }).toArray();
  const seller = users[0] || {};
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const category = String(req.body.category || "").trim();
  const type = String(req.body.type || "").trim();
  const liveLink = String(req.body.liveLink || "").trim();
  const price = Number(req.body.price || 0);
  if (!title || !description || !category || !type || !price || price <= 0) {
    return res.status(400).json({ message: "Title, description, category, type, and valid price are required." });
  }
  const files = req.files || {};
  const imageFiles = Array.isArray(files.images) ? files.images : [];
  const videoFile = Array.isArray(files.videos) && files.videos[0] ? files.videos[0] : null;
  const posterFile = Array.isArray(files.poster) && files.poster[0] ? files.poster[0] : null;
  const zipFile = Array.isArray(files.zipFile) && files.zipFile[0] ? files.zipFile[0] : null;
  const videoMode = isVideoCategory(category);
  const imageUrls = [];
  let videoUrl = "";
  let posterUrl = "";
  if (videoMode) {
    videoUrl = videoFile ? fileUrl(req, videoFile) : String(req.body.videoUrl || "").trim();
    posterUrl = posterFile
      ? await convertImageFileToWebp(req, posterFile)
      : String(req.body.posterUrl || req.body.imageUrl || "").trim();
  } else {
    for (const f of imageFiles) {
      const converted = await convertImageFileToWebp(req, f);
      if (converted) imageUrls.push(converted);
    }
  }
  const zipFileUrl = zipFile ? fileUrl(req, zipFile) : String(req.body.zipFileUrl || "").trim();
  if (!zipFileUrl) return res.status(400).json({ message: "ZIP file is required." });
  if (videoMode && !videoUrl) {
    return res.status(400).json({ message: "Video file is required for video category." });
  }
  if (videoMode && !posterUrl) {
    return res.status(400).json({ message: "Poster image is required for video category." });
  }
  if (!videoMode && !imageUrls.length && !String(req.body.imageUrl || "").trim()) {
    return res.status(400).json({ message: "At least one image is required." });
  }
  const now = new Date();
  const payload = {
    title,
    description,
    category,
    type,
    liveLink,
    price,
    imageUrls: videoMode
      ? [posterUrl]
      : (imageUrls.length ? imageUrls : [String(req.body.imageUrl || "").trim()]),
    imageUrl: videoMode
      ? posterUrl
      : (imageUrls[0] || String(req.body.imageUrl || "").trim()),
    mediaKind: videoMode ? "video" : "image",
    videoUrl: videoMode ? videoUrl : "",
    posterUrl: videoMode ? posterUrl : "",
    imageData: "",
    zipFileUrl,
    sellerId: req.user.id,
    sellerEmail: seller.email || req.user.email || "",
    sellerShopName: seller.shopName || req.user.shopName || "",
    salesCount: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  await db.collection("posts").insertOne(payload);
  return res.json({ message: "Product submitted." });
});

app.post("/api/products", authMiddleware, requireSeller, maybeProductFiles, async (req, res) => {
  const db = await getDb();
  const users = await db.collection("users").find({ _id: new ObjectId(req.user.id) }).toArray();
  const seller = users[0] || {};
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const category = String(req.body.category || "").trim();
  const type = String(req.body.type || "").trim();
  const liveLink = String(req.body.liveLink || "").trim();
  const price = Number(req.body.price || 0);
  if (!title || !description || !category || !type || !price || price <= 0) {
    return res.status(400).json({ message: "Title, description, category, type, and valid price are required." });
  }
  const files = req.files || {};
  const imageFiles = Array.isArray(files.images) ? files.images : [];
  const videoFile = Array.isArray(files.videos) && files.videos[0] ? files.videos[0] : null;
  const posterFile = Array.isArray(files.poster) && files.poster[0] ? files.poster[0] : null;
  const zipFile = Array.isArray(files.zipFile) && files.zipFile[0] ? files.zipFile[0] : null;
  const videoMode = isVideoCategory(category);
  const imageUrls = [];
  let videoUrl = "";
  let posterUrl = "";
  if (videoMode) {
    videoUrl = videoFile ? fileUrl(req, videoFile) : String(req.body.videoUrl || "").trim();
    posterUrl = posterFile
      ? await convertImageFileToWebp(req, posterFile)
      : String(req.body.posterUrl || req.body.imageUrl || "").trim();
  } else {
    for (const f of imageFiles) {
      const converted = await convertImageFileToWebp(req, f);
      if (converted) imageUrls.push(converted);
    }
  }
  const zipFileUrl = zipFile ? fileUrl(req, zipFile) : String(req.body.zipFileUrl || "").trim();
  if (!zipFileUrl) return res.status(400).json({ message: "ZIP file is required." });
  if (videoMode && !videoUrl) {
    return res.status(400).json({ message: "Video file is required for video category." });
  }
  if (videoMode && !posterUrl) {
    return res.status(400).json({ message: "Poster image is required for video category." });
  }
  if (!videoMode && !imageUrls.length && !String(req.body.imageUrl || "").trim()) {
    return res.status(400).json({ message: "At least one image is required." });
  }
  const now = new Date();
  const payload = {
    title,
    description,
    category,
    type,
    liveLink,
    price,
    imageUrls: videoMode
      ? [posterUrl]
      : (imageUrls.length ? imageUrls : [String(req.body.imageUrl || "").trim()]),
    imageUrl: videoMode
      ? posterUrl
      : (imageUrls[0] || String(req.body.imageUrl || "").trim()),
    mediaKind: videoMode ? "video" : "image",
    videoUrl: videoMode ? videoUrl : "",
    posterUrl: videoMode ? posterUrl : "",
    imageData: "",
    zipFileUrl,
    sellerId: req.user.id,
    sellerEmail: seller.email || req.user.email || "",
    sellerShopName: seller.shopName || req.user.shopName || "",
    salesCount: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  await db.collection("posts").insertOne(payload);
  return res.json({ message: "Product submitted." });
});

app.put("/api/posts/:id", authMiddleware, requireSeller, maybeProductFiles, async (req, res) => {
  const db = await getDb();
  const item = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!item) return res.status(404).json({ message: "Not found" });
  const ownsById = item.sellerId === req.user.id || item.userId === req.user.id;
  const ownsByEmail = (item.sellerEmail && item.sellerEmail === req.user.email) || (item.userEmail && item.userEmail === req.user.email);
  if (!ownsById && !ownsByEmail) return res.status(403).json({ message: "Forbidden" });

  const currentImages = Array.isArray(item.imageUrls) && item.imageUrls.length
    ? item.imageUrls
    : (item.imageUrl ? [item.imageUrl] : []);
  const currentVideo = String(item.videoUrl || "");
  const existingImages = req.body.existingImages !== undefined
    ? parseList(req.body.existingImages)
    : currentImages;
  const removedImages = currentImages.filter((url) => !existingImages.includes(url));
  await Promise.all(removedImages.map((url) => deleteUpload(url)));
  const files = req.files || {};
  const imageFiles = Array.isArray(files.images) ? files.images : [];
  const videoFile = Array.isArray(files.videos) && files.videos[0] ? files.videos[0] : null;
  const posterFile = Array.isArray(files.poster) && files.poster[0] ? files.poster[0] : null;
  const newUrls = [];
  for (const f of imageFiles) {
    const converted = await convertImageFileToWebp(req, f);
    if (converted) newUrls.push(converted);
  }
  const imageUrls = [...existingImages, ...newUrls];
  const zipFile = Array.isArray(files.zipFile) && files.zipFile[0] ? files.zipFile[0] : null;
  const zipFileUrl = zipFile ? fileUrl(req, zipFile) : (req.body.zipFileUrl || item.zipFileUrl || "");
  if (!zipFileUrl) return res.status(400).json({ message: "ZIP file is required." });
  const nextCategory = String(req.body.category || item.category || "").trim();
  const videoMode = isVideoCategory(nextCategory);
  let nextVideoUrl = currentVideo;
  if (videoFile) {
    nextVideoUrl = fileUrl(req, videoFile);
    if (currentVideo && currentVideo !== nextVideoUrl) await deleteUpload(currentVideo);
  } else if (req.body.videoUrl !== undefined) {
    nextVideoUrl = String(req.body.videoUrl || "").trim();
    if (!nextVideoUrl && currentVideo) await deleteUpload(currentVideo);
  }
  let nextPosterUrl = imageUrls[0] || String(req.body.posterUrl || item.posterUrl || item.imageUrl || "").trim();
  if (posterFile) {
    const convertedPoster = await convertImageFileToWebp(req, posterFile);
    if (convertedPoster) {
      if (nextPosterUrl && nextPosterUrl !== convertedPoster) await deleteUpload(nextPosterUrl);
      nextPosterUrl = convertedPoster;
    }
  } else if (req.body.posterUrl !== undefined) {
    nextPosterUrl = String(req.body.posterUrl || "").trim();
  }
  if (videoMode && !nextVideoUrl) return res.status(400).json({ message: "Video is required for video category." });
  if (videoMode && !nextPosterUrl) return res.status(400).json({ message: "Poster is required for video category." });
  if (!videoMode && !imageUrls.length && !String(req.body.imageUrl || item.imageUrl || "").trim()) {
    return res.status(400).json({ message: "At least one image is required." });
  }
  const payload = {
    title: String(req.body.title || item.title || "").trim(),
    description: String(req.body.description || item.description || "").trim(),
    category: nextCategory,
    type: String(req.body.type || item.type || "").trim(),
    liveLink: String(req.body.liveLink || item.liveLink || "").trim(),
    price: Number(req.body.price || item.price || 0),
    imageUrls: videoMode
      ? [nextPosterUrl]
      : (imageUrls.length ? imageUrls : currentImages),
    imageUrl: videoMode
      ? nextPosterUrl
      : (imageUrls[0] || currentImages[0] || ""),
    mediaKind: videoMode ? "video" : "image",
    videoUrl: videoMode ? nextVideoUrl : "",
    posterUrl: videoMode ? nextPosterUrl : "",
    zipFileUrl,
    updatedAt: new Date()
  };
  await db.collection("posts").updateOne({ _id: new ObjectId(req.params.id) }, { $set: payload });
  return res.json({ message: "Updated" });
});

app.put("/api/products/:id", authMiddleware, requireSeller, maybeProductFiles, async (req, res) => {
  const db = await getDb();
  const item = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!item) return res.status(404).json({ message: "Not found" });
  const ownsById = item.sellerId === req.user.id || item.userId === req.user.id;
  const ownsByEmail = (item.sellerEmail && item.sellerEmail === req.user.email) || (item.userEmail && item.userEmail === req.user.email);
  if (!ownsById && !ownsByEmail) return res.status(403).json({ message: "Forbidden" });
  const currentImages = Array.isArray(item.imageUrls) && item.imageUrls.length
    ? item.imageUrls
    : (item.imageUrl ? [item.imageUrl] : []);
  const currentVideo = String(item.videoUrl || "");
  const existingImages = req.body.existingImages !== undefined
    ? parseList(req.body.existingImages)
    : currentImages;
  const removedImages = currentImages.filter((url) => !existingImages.includes(url));
  await Promise.all(removedImages.map((url) => deleteUpload(url)));
  const files = req.files || {};
  const imageFiles = Array.isArray(files.images) ? files.images : [];
  const videoFile = Array.isArray(files.videos) && files.videos[0] ? files.videos[0] : null;
  const posterFile = Array.isArray(files.poster) && files.poster[0] ? files.poster[0] : null;
  const newUrls = [];
  for (const f of imageFiles) {
    const converted = await convertImageFileToWebp(req, f);
    if (converted) newUrls.push(converted);
  }
  const imageUrls = [...existingImages, ...newUrls];
  const zipFile = Array.isArray(files.zipFile) && files.zipFile[0] ? files.zipFile[0] : null;
  const zipFileUrl = zipFile ? fileUrl(req, zipFile) : (req.body.zipFileUrl || item.zipFileUrl || "");
  if (!zipFileUrl) return res.status(400).json({ message: "ZIP file is required." });
  const nextCategory = String(req.body.category || item.category || "").trim();
  const videoMode = isVideoCategory(nextCategory);
  let nextVideoUrl = currentVideo;
  if (videoFile) {
    nextVideoUrl = fileUrl(req, videoFile);
    if (currentVideo && currentVideo !== nextVideoUrl) await deleteUpload(currentVideo);
  } else if (req.body.videoUrl !== undefined) {
    nextVideoUrl = String(req.body.videoUrl || "").trim();
    if (!nextVideoUrl && currentVideo) await deleteUpload(currentVideo);
  }
  let nextPosterUrl = imageUrls[0] || String(req.body.posterUrl || item.posterUrl || item.imageUrl || "").trim();
  if (posterFile) {
    const convertedPoster = await convertImageFileToWebp(req, posterFile);
    if (convertedPoster) {
      if (nextPosterUrl && nextPosterUrl !== convertedPoster) await deleteUpload(nextPosterUrl);
      nextPosterUrl = convertedPoster;
    }
  } else if (req.body.posterUrl !== undefined) {
    nextPosterUrl = String(req.body.posterUrl || "").trim();
  }
  if (videoMode && !nextVideoUrl) return res.status(400).json({ message: "Video is required for video category." });
  if (videoMode && !nextPosterUrl) return res.status(400).json({ message: "Poster is required for video category." });
  if (!videoMode && !imageUrls.length && !String(req.body.imageUrl || item.imageUrl || "").trim()) {
    return res.status(400).json({ message: "At least one image is required." });
  }
  const payload = {
    title: String(req.body.title || item.title || "").trim(),
    description: String(req.body.description || item.description || "").trim(),
    category: nextCategory,
    type: String(req.body.type || item.type || "").trim(),
    liveLink: String(req.body.liveLink || item.liveLink || "").trim(),
    price: Number(req.body.price || item.price || 0),
    imageUrls: videoMode
      ? [nextPosterUrl]
      : (imageUrls.length ? imageUrls : currentImages),
    imageUrl: videoMode
      ? nextPosterUrl
      : (imageUrls[0] || currentImages[0] || ""),
    mediaKind: videoMode ? "video" : "image",
    videoUrl: videoMode ? nextVideoUrl : "",
    posterUrl: videoMode ? nextPosterUrl : "",
    zipFileUrl,
    updatedAt: new Date()
  };
  await db.collection("posts").updateOne({ _id: new ObjectId(req.params.id) }, { $set: payload });
  return res.json({ message: "Updated" });
});

app.put("/api/admin/posts/:id", adminMiddleware, maybeProductFiles, async (req, res) => {
  const db = await getDb();
  const current = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!current) return res.status(404).json({ message: "Not found" });
  const currentImages = Array.isArray(current.imageUrls) && current.imageUrls.length
    ? current.imageUrls
    : (current.imageUrl ? [current.imageUrl] : []);
  const currentVideo = String(current.videoUrl || "");
  const existingImages = req.body.existingImages !== undefined
    ? parseList(req.body.existingImages)
    : currentImages;
  const removedImages = currentImages.filter((url) => !existingImages.includes(url));
  await Promise.all(removedImages.map((url) => deleteUpload(url)));
  const files = req.files || {};
  const imageFiles = Array.isArray(files.images) ? files.images : [];
  const videoFile = Array.isArray(files.videos) && files.videos[0] ? files.videos[0] : null;
  const posterFile = Array.isArray(files.poster) && files.poster[0] ? files.poster[0] : null;
  const newUrls = [];
  for (const f of imageFiles) {
    const converted = await convertImageFileToWebp(req, f);
    if (converted) newUrls.push(converted);
  }
  const imageUrls = [...existingImages, ...newUrls].filter(Boolean);
  const zipFile = Array.isArray(files.zipFile) && files.zipFile[0] ? files.zipFile[0] : null;
  const zipFileUrl = zipFile ? fileUrl(req, zipFile) : (req.body.zipFileUrl || current.zipFileUrl || "");
  const nextCategory = String(req.body.category || current.category || "").trim();
  const videoMode = isVideoCategory(nextCategory);
  let nextVideoUrl = currentVideo;
  if (videoFile) {
    nextVideoUrl = fileUrl(req, videoFile);
    if (currentVideo && currentVideo !== nextVideoUrl) await deleteUpload(currentVideo);
  } else if (req.body.videoUrl !== undefined) {
    nextVideoUrl = String(req.body.videoUrl || "").trim();
    if (!nextVideoUrl && currentVideo) await deleteUpload(currentVideo);
  }
  let nextPosterUrl = imageUrls[0] || String(req.body.posterUrl || current.posterUrl || current.imageUrl || "").trim();
  if (posterFile) {
    const convertedPoster = await convertImageFileToWebp(req, posterFile);
    if (convertedPoster) {
      if (nextPosterUrl && nextPosterUrl !== convertedPoster) await deleteUpload(nextPosterUrl);
      nextPosterUrl = convertedPoster;
    }
  } else if (req.body.posterUrl !== undefined) {
    nextPosterUrl = String(req.body.posterUrl || "").trim();
  }
  if (videoMode && !nextVideoUrl) return res.status(400).json({ message: "Video is required for video category." });
  if (videoMode && !nextPosterUrl) return res.status(400).json({ message: "Poster is required for video category." });
  if (!videoMode && !imageUrls.length && !String(req.body.imageUrl || current.imageUrl || "").trim()) {
    return res.status(400).json({ message: "At least one image is required." });
  }
  const payload = {
    title: String(req.body.title || current.title || "").trim(),
    description: String(req.body.description || current.description || "").trim(),
    category: nextCategory,
    type: String(req.body.type || current.type || "").trim(),
    liveLink: String(req.body.liveLink || current.liveLink || "").trim(),
    price: Number(req.body.price || current.price || 0),
    imageUrls: videoMode
      ? [nextPosterUrl]
      : (imageUrls.length ? imageUrls : currentImages),
    imageUrl: videoMode
      ? nextPosterUrl
      : (imageUrls[0] || currentImages[0] || ""),
    mediaKind: videoMode ? "video" : "image",
    videoUrl: videoMode ? nextVideoUrl : "",
    posterUrl: videoMode ? nextPosterUrl : "",
    zipFileUrl,
    status: String(req.body.status || current.status || "pending"),
    updatedAt: new Date()
  };
  await db.collection("posts").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: payload }
  );
  return res.json({ message: "Updated" });
});

app.put("/api/admin/products/:id", adminMiddleware, maybeProductFiles, async (req, res) => {
  const db = await getDb();
  const current = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!current) return res.status(404).json({ message: "Not found" });
  const currentImages = Array.isArray(current.imageUrls) && current.imageUrls.length
    ? current.imageUrls
    : (current.imageUrl ? [current.imageUrl] : []);
  const currentVideo = String(current.videoUrl || "");
  const existingImages = req.body.existingImages !== undefined
    ? parseList(req.body.existingImages)
    : currentImages;
  const removedImages = currentImages.filter((url) => !existingImages.includes(url));
  await Promise.all(removedImages.map((url) => deleteUpload(url)));
  const files = req.files || {};
  const imageFiles = Array.isArray(files.images) ? files.images : [];
  const videoFile = Array.isArray(files.videos) && files.videos[0] ? files.videos[0] : null;
  const posterFile = Array.isArray(files.poster) && files.poster[0] ? files.poster[0] : null;
  const newUrls = [];
  for (const f of imageFiles) {
    const converted = await convertImageFileToWebp(req, f);
    if (converted) newUrls.push(converted);
  }
  const imageUrls = [...existingImages, ...newUrls].filter(Boolean);
  const zipFile = Array.isArray(files.zipFile) && files.zipFile[0] ? files.zipFile[0] : null;
  const zipFileUrl = zipFile ? fileUrl(req, zipFile) : (req.body.zipFileUrl || current.zipFileUrl || "");
  const nextCategory = String(req.body.category || current.category || "").trim();
  const videoMode = isVideoCategory(nextCategory);
  let nextVideoUrl = currentVideo;
  if (videoFile) {
    nextVideoUrl = fileUrl(req, videoFile);
    if (currentVideo && currentVideo !== nextVideoUrl) await deleteUpload(currentVideo);
  } else if (req.body.videoUrl !== undefined) {
    nextVideoUrl = String(req.body.videoUrl || "").trim();
    if (!nextVideoUrl && currentVideo) await deleteUpload(currentVideo);
  }
  let nextPosterUrl = imageUrls[0] || String(req.body.posterUrl || current.posterUrl || current.imageUrl || "").trim();
  if (posterFile) {
    const convertedPoster = await convertImageFileToWebp(req, posterFile);
    if (convertedPoster) {
      if (nextPosterUrl && nextPosterUrl !== convertedPoster) await deleteUpload(nextPosterUrl);
      nextPosterUrl = convertedPoster;
    }
  } else if (req.body.posterUrl !== undefined) {
    nextPosterUrl = String(req.body.posterUrl || "").trim();
  }
  if (videoMode && !nextVideoUrl) return res.status(400).json({ message: "Video is required for video category." });
  if (videoMode && !nextPosterUrl) return res.status(400).json({ message: "Poster is required for video category." });
  if (!videoMode && !imageUrls.length && !String(req.body.imageUrl || current.imageUrl || "").trim()) {
    return res.status(400).json({ message: "At least one image is required." });
  }
  const payload = {
    title: String(req.body.title || current.title || "").trim(),
    description: String(req.body.description || current.description || "").trim(),
    category: nextCategory,
    type: String(req.body.type || current.type || "").trim(),
    liveLink: String(req.body.liveLink || current.liveLink || "").trim(),
    price: Number(req.body.price || current.price || 0),
    imageUrls: videoMode
      ? [nextPosterUrl]
      : (imageUrls.length ? imageUrls : currentImages),
    imageUrl: videoMode
      ? nextPosterUrl
      : (imageUrls[0] || currentImages[0] || ""),
    mediaKind: videoMode ? "video" : "image",
    videoUrl: videoMode ? nextVideoUrl : "",
    posterUrl: videoMode ? nextPosterUrl : "",
    zipFileUrl,
    status: String(req.body.status || current.status || "pending"),
    updatedAt: new Date()
  };
  await db.collection("posts").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: payload }
  );
  return res.json({ message: "Updated" });
});

app.put("/api/posts/:id/approve", adminMiddleware, approveItem("posts"));
app.delete("/api/posts/:id", adminMiddleware, deleteItem("posts"));
app.put("/api/admin/products/:id/approve", adminMiddleware, approveItem("posts"));

app.delete("/api/products/:id", authMiddleware, async (req, res) => {
  const db = await getDb();
  const item = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!item) return res.status(404).json({ message: "Not found" });
  const isAdmin = req.user.role === "admin";
  const isSellerOwner = (req.user.role || "buyer") === "seller"
    && (item.sellerId === req.user.id || item.userId === req.user.id || item.sellerEmail === req.user.email);
  if (!isAdmin && !isSellerOwner) return res.status(403).json({ message: "Forbidden" });
  const images = Array.isArray(item.imageUrls) && item.imageUrls.length
    ? item.imageUrls
    : (item.imageUrl ? [item.imageUrl] : []);
  await Promise.all(images.map((url) => deleteUpload(url)));
  if (item.videoUrl) await deleteUpload(item.videoUrl);
  await deleteUpload(item.zipFileUrl || "");
  await db.collection("posts").deleteOne({ _id: item._id });
  return res.json({ message: "Deleted" });
});

app.put("/api/admin/posts/:id/approve", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const posts = await db.collection("posts").find({ _id: new ObjectId(req.params.id) }).toArray();
  const post = posts[0];
  if (!post) return res.status(404).json({ message: "Not found" });
  let user = null;
  if (post.userId && ObjectId.isValid(post.userId)) {
    const users = await db.collection("users").find({ _id: new ObjectId(post.userId) }).toArray();
    user = users[0] || null;
  } else if (post.userEmail) {
    const users = await db.collection("users").find({ email: post.userEmail }).toArray();
    user = users[0] || null;
  }
  await db.collection("posts").updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $set: {
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );
  return res.json({ message: "Approved" });
});

app.get("/api/settings/web", async (req, res) => {
  const db = await getDb();
  const settings = await db.collection("settings").find({ key: "web" }).toArray();
  let web = settings[0];
  if (!web) {
    const legacy = await db.collection("settings").find({ key: "hero" }).toArray();
    web = legacy[0] || {};
  }
  return res.json({
    heroImage: web.heroImage || "",
    heroBg: web.heroBg || "",
    contactEmail: web.contactEmail || ""
  });
});

app.put("/api/settings/web", adminMiddleware, maybeSettingsAssets, async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.collection("settings").findOne({ key: "web" });
    const heroImageFile = req.files?.heroImage?.[0] || null;
    const heroVideoFile = req.files?.heroVideo?.[0] || null;
    let heroImage = existing?.heroImage || "";
    let heroBg = existing?.heroBg || "";
    if (heroImageFile) {
      const nextImage = await convertImageFileToWebp(req, heroImageFile);
      if (nextImage) {
        await deleteUpload(heroImage);
        heroImage = nextImage;
      }
    }
  if (heroVideoFile) {
      const nextVideo = fileUrl(req, heroVideoFile);
      if (nextVideo) {
        await deleteUpload(heroBg);
        heroBg = nextVideo;
      }
    }
    await db.collection("settings").updateOne(
      { key: "web" },
      {
        $set: {
          key: "web",
          heroImage,
          heroBg,
          contactEmail: req.body.contactEmail || "",
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    return res.json({ message: "Settings updated" });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Settings update failed" });
  }
});

app.get("/api/admin/pending", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const [jobs, properties, pets, posts, users] = await Promise.all([
    db.collection("jobs").find({ status: "pending" }).sort({ createdAt: -1 }).toArray(),
    db.collection("properties").find({ status: "pending" }).sort({ createdAt: -1 }).toArray(),
    db.collection("pets").find({ status: "pending" }).sort({ createdAt: -1 }).toArray(),
    db.collection("posts").find({ status: "pending" }).sort({ createdAt: -1 }).toArray(),
    db.collection("users").find({}, { projection: { password: 0, passwordHash: 0 } }).toArray()
  ]);
  const userMapById = new Map(users.map((u) => [String(u._id), u]));
  const userMapByEmail = new Map(users.map((u) => [u.email, u]));
  const enrichedPosts = posts.map((post) => {
    const user = userMapById.get(String(post.userId)) || userMapByEmail.get(post.userEmail) || null;
    const isPaidUser = !!(user?.paid && user?.paidUntil && new Date(user.paidUntil) > new Date());
    return { ...post, isPaidUser, paidUntil: user?.paidUntil || null };
  });
  return res.json({ jobs, properties, pets, posts: enrichedPosts });
});

app.get("/api/admin/approved", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const [jobs, properties, pets, posts] = await Promise.all([
    db.collection("jobs").find({ status: "approved" }).sort({ createdAt: -1 }).toArray(),
    db.collection("properties").find({ status: "approved" }).sort({ createdAt: -1 }).toArray(),
    db.collection("pets").find({ status: "approved" }).sort({ createdAt: -1 }).toArray(),
    db.collection("posts").find({ status: "approved" }).sort({ createdAt: -1 }).toArray()
  ]);
  return res.json({ jobs, properties, pets, posts });
});

app.get("/api/admin/users", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const users = await db.collection("users").find({}, { projection: { password: 0, passwordHash: 0 } }).toArray();
  return res.json(users);
});

app.put("/api/admin/users/:id", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const { name, email, paid, paidUntil } = req.body;
  const payload = {
    updatedAt: new Date()
  };
  if (name !== undefined) payload.name = name;
  if (email !== undefined) payload.email = email;
  if (paid !== undefined) payload.paid = !!paid;
  if (paidUntil !== undefined) {
    payload.paidUntil = paidUntil ? new Date(paidUntil) : null;
  }
  await db.collection("users").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: payload }
  );
  return res.json({ message: "User updated" });
});

app.post("/api/search-log", async (req, res) => {
  const db = await getDb();
  await db.collection("search_logs").insertOne({
    category: req.body.category || "All",
    query: req.body.query || "",
    createdAt: new Date()
  });
  return res.json({ message: "Logged" });
});

app.get("/api/admin/trending", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const logs = await db.collection("search_logs").find({}).toArray();
  const counts = {};
  logs.forEach((log) => {
    const key = log.category || "All";
    counts[key] = (counts[key] || 0) + 1;
  });
  const items = Object.entries(counts).map(([name, count]) => ({ name, count }));
  items.sort((a, b) => b.count - a.count);
  return res.json(items);
});

app.get("/api/seller/products", authMiddleware, requireSeller, async (req, res) => {
  const db = await getDb();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();
  const type = String(req.query.type || "").trim();
  const and = [{ $or: [{ sellerId: req.user.id }, { sellerEmail: req.user.email }, { userId: req.user.id }, { userEmail: req.user.email }] }];
  if (search) {
    and.push({
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } }
      ]
    });
  }
  if (category) and.push({ category: { $regex: `^${escapeRegex(category)}$`, $options: "i" } });
  if (type) and.push({ type: { $regex: `^${escapeRegex(type)}$`, $options: "i" } });
  const query = { $and: and };
  const total = await db.collection("posts").countDocuments(query);
  const items = await db.collection("posts").find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
  return res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

app.get("/api/seller/stats", authMiddleware, requireSeller, async (req, res) => {
  const db = await getDb();
  const sellerItems = await db.collection("posts").find({
    $or: [{ sellerId: req.user.id }, { sellerEmail: req.user.email }, { userId: req.user.id }, { userEmail: req.user.email }]
  }).toArray();
  const purchases = await db.collection("purchases").find({ sellerId: req.user.id }).sort({ createdAt: -1 }).toArray();
  const totalProducts = sellerItems.length;
  const totalSalesCount = sellerItems.reduce((sum, item) => sum + Number(item.salesCount || 0), 0);
  const totalOrders = purchases.length;
  const totalEarnings = purchases.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const topProducts = sellerItems
    .map((item) => ({ title: item.title || "Untitled", salesCount: Number(item.salesCount || 0) }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 8);
  const recentOrders = purchases.slice(0, 10).map((item) => ({
    purchaseId: item._id,
    productId: item.productId || "",
    productTitle: item.productTitle || "Untitled",
    buyerEmail: item.userEmail || "",
    paymentId: item.paymentId || "",
    orderId: item.orderId || "",
    amount: Number(item.amount || 0),
    createdAt: item.createdAt
  }));
  return res.json({ totalProducts, totalSalesCount, totalOrders, totalEarnings, topProducts, recentOrders });
});

app.post("/api/checkout/create-order", authMiddleware, requireBuyer, async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId || !ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Valid productId is required" });
    }
    const db = await getDb();
    const product = await db.collection("posts").findOne({ _id: new ObjectId(productId), status: "approved" });
    if (!product) return res.status(404).json({ message: "Product not found" });
    const ownerId = String(product.sellerId || product.userId || "");
    if (ownerId === String(req.user.id)) {
      return res.status(403).json({ message: "Seller cannot buy own product" });
    }
    const existingPurchase = await db.collection("purchases").findOne({
      userId: String(req.user.id),
      productId: String(product._id)
    });
    if (existingPurchase) {
      return res.status(409).json({ message: "Already purchased" });
    }
    const amount = Math.max(1, Math.round(Number(product.price || 0) * 100));
    const receipt = `pm_${Date.now().toString(36)}_${String(product._id).slice(-8)}`;
    const payload = {
      amount,
      currency: "INR",
      receipt,
      payment_capture: 1,
      notes: {
        productId: String(product._id),
        buyerId: String(req.user.id)
      }
    };
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({ message: data.error?.description || "Order creation failed" });
    }
    await db.collection("checkout_orders").insertOne({
      orderId: data.id,
      buyerId: String(req.user.id),
      buyerEmail: req.user.email || "",
      productId: String(product._id),
      amount: Number(product.price || 0),
      currency: "INR",
      createdAt: new Date()
    });
    return res.json({ order: data, keyId: razorpayKeyId, product: { id: product._id, title: product.title, price: product.price } });
  } catch (err) {
    return res.status(500).json({ message: "Checkout order failed" });
  }
});

app.post("/api/checkout/verify", authMiddleware, requireBuyer, async (req, res) => {
  const { productId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!productId || !ObjectId.isValid(productId) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification details" });
  }
  const generated = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (generated !== razorpay_signature) {
    return res.status(400).json({ message: "Payment verification failed" });
  }
  const db = await getDb();
  const product = await db.collection("posts").findOne({ _id: new ObjectId(productId), status: "approved" });
  if (!product) return res.status(404).json({ message: "Product not found" });
  const ownerId = String(product.sellerId || product.userId || "");
  if (ownerId === String(req.user.id)) {
    return res.status(403).json({ message: "Seller cannot buy own product" });
  }
  const users = await db.collection("users").find({ _id: new ObjectId(req.user.id) }).toArray();
  const buyer = users[0];
  if (!buyer) return res.status(404).json({ message: "Buyer not found" });
  const existing = await db.collection("purchases").findOne({
    userId: String(req.user.id),
    productId: String(product._id)
  });
  if (existing) {
    return res.status(409).json({ message: "Already purchased", purchase: existing });
  }
  const purchase = {
    userId: String(req.user.id),
    userEmail: buyer.email || req.user.email || "",
    userName: buyer.name || "",
    productId: String(product._id),
    productTitle: product.title || "",
    sellerId: ownerId,
    amount: Number(product.price || 0),
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    paymentStatus: "paid",
    createdAt: new Date()
  };
  await db.collection("purchases").insertOne(purchase);
  await db.collection("posts").updateOne(
    { _id: product._id },
    { $inc: { salesCount: 1 }, $set: { updatedAt: new Date() } }
  );
  return res.json({ message: "Purchase verified", purchase });
});

app.get("/api/purchases/my", authMiddleware, requireBuyer, async (req, res) => {
  const db = await getDb();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(25, Math.max(1, parseInt(req.query.limit || "10", 10)));
  const query = { userId: String(req.user.id) };
  const total = await db.collection("purchases").countDocuments(query);
  const items = await db.collection("purchases").find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
  return res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

app.get("/api/admin/purchases", adminMiddleware, async (req, res) => {
  const db = await getDb();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10)));
  const search = String(req.query.search || "").trim();
  const query = search
    ? {
        $or: [
          { userEmail: { $regex: search, $options: "i" } },
          { productTitle: { $regex: search, $options: "i" } },
          { userName: { $regex: search, $options: "i" } }
        ]
      }
    : {};
  const total = await db.collection("purchases").countDocuments(query);
  const items = await db.collection("purchases").find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray();
  return res.json({ items, page, pages: Math.max(1, Math.ceil(total / limit)), total });
});

app.get("/api/products/:id/access", authMiddleware, async (req, res) => {
  const db = await getDb();
  const product = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!product) return res.status(404).json({ message: "Product not found" });
  const isOwner = String(product.sellerId || product.userId || "") === String(req.user.id);
  if (isOwner) return res.json({ hasPurchased: true, locked: false, owner: true });
  const hasPurchased = !!(await db.collection("purchases").findOne({
    userId: String(req.user.id),
    productId: String(product._id)
  }));
  return res.json({ hasPurchased, locked: !hasPurchased, owner: false });
});

app.get("/api/products/:id/download", authMiddleware, async (req, res) => {
  const db = await getDb();
  const product = await db.collection("posts").findOne({ _id: new ObjectId(req.params.id) });
  if (!product) return res.status(404).json({ message: "Product not found" });
  const isOwner = String(product.sellerId || product.userId || "") === String(req.user.id);
  const role = req.user.role || "buyer";
  if (!isOwner && role !== "buyer") {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!isOwner) {
    const hasPurchased = !!(await db.collection("purchases").findOne({
      userId: String(req.user.id),
      productId: String(product._id)
    }));
    if (!hasPurchased) {
      return res.status(403).json({ message: "Purchase required before download" });
    }
  }
  if (!product.zipFileUrl) return res.status(404).json({ message: "Product file unavailable" });
  return res.json({ downloadUrl: product.zipFileUrl });
});

app.post("/api/payments/create-order", authMiddleware, requireBuyer, async (req, res) => {
  try {
    const amount = 35000;
    const payload = {
      amount,
      currency: "INR",
      receipt: `puneclass_${Date.now()}`,
      payment_capture: 1
    };
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({ message: data.error?.description || "Order creation failed" });
    }
    return res.json({ order: data, keyId: razorpayKeyId });
  } catch (err) {
    return res.status(500).json({ message: "Payment order failed" });
  }
});

app.post("/api/payments/verify", authMiddleware, requireBuyer, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification details" });
  }
  const generated = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (generated !== razorpay_signature) {
    return res.status(400).json({ message: "Payment verification failed" });
  }
  const db = await getDb();
  const paidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.collection("users").updateOne(
    { _id: new ObjectId(req.user.id) },
    { $set: { paid: true, paidUntil, updatedAt: new Date() } }
  );
  await db.collection("payments").insertOne({
    userId: req.user.id,
    email: req.user.email,
    amount: 350,
    currency: "INR",
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    paidUntil,
    createdAt: new Date()
  });
  return res.json({ message: "Payment verified", paidUntil });
});

app.delete("/api/admin/users/:id", adminMiddleware, async (req, res) => {
  const db = await getDb();
  await db.collection("users").deleteOne({ _id: new ObjectId(req.params.id) });
  return res.json({ message: "User removed" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  const db = await getDb();
  const users = await db.collection("users").find({ _id: new ObjectId(req.user.id) }).toArray();
  const user = users[0];
  if (!user) return res.status(404).json({ message: "User not found" });
  const role = user.role || "buyer";
  let earnings = null;
  if (role === "seller") {
    const purchases = await db.collection("purchases").find({ sellerId: String(user._id) }).toArray();
    earnings = {
      totalRevenue: purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      totalOrders: purchases.length
    };
  }
  return res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role,
    shopName: user.shopName || "",
    paid: !!user.paid,
    paidUntil: user.paidUntil || null,
    earnings
  });
});

app.get("/api/me/payments", authMiddleware, async (req, res) => {
  const db = await getDb();
  const items = await db
    .collection("payments")
    .find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .toArray();
  return res.json(items);
});

app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Uploaded file is too large." });
  }
  return res.status(500).json({ message: err.message || "Server error" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

