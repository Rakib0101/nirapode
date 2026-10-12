import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
	console.log("🌱  Seeding database…\n");

	const SEED_EMAILS = [
		"superadmin@mail.com",
		"admin@mail.com",
		"mod@mail.com",
		"user@mail.com",
		"user2@mail.com",
		"user3@mail.com",
	];

	// ── Clean previous seed data (safe dependency order) ─────────────────────
	await prisma.shareTrade.deleteMany();
	await prisma.shareListing.deleteMany();
	await prisma.walletTransaction.deleteMany();
	await prisma.sharePurchaseRequest.deleteMany();
	await prisma.shareOwnership.deleteMany();
	await prisma.depositRequest.deleteMany();
	await prisma.checkout.deleteMany();
	await prisma.airTicketRequest.deleteMany();
	await prisma.taxiRequest.deleteMany();
	await prisma.taxiVendor.deleteMany();
	await prisma.lostFoundPost.deleteMany();
	await prisma.notification.deleteMany({
		where: { user: { email: { in: SEED_EMAILS } } },
	});
	await prisma.blogCategory.deleteMany();
	await prisma.otpToken.deleteMany({
		where: { user: { email: { in: SEED_EMAILS } } },
	});
	await prisma.wallet.deleteMany({
		where: { user: { email: { in: SEED_EMAILS } } },
	});
	await prisma.serviceRequest.deleteMany();
	await prisma.applyService.deleteMany();
	await prisma.islamicArticle.deleteMany();
	await prisma.project.deleteMany();
	await prisma.user.deleteMany({ where: { email: { in: SEED_EMAILS } } });

	// ── Users ─────────────────────────────────────────────────────────────────
	const [h1, h2, h3, h4, h5, h6] = await Promise.all([
		bcrypt.hash("password", 12),
		bcrypt.hash("password", 12),
		bcrypt.hash("password", 12),
		bcrypt.hash("password", 12),
		bcrypt.hash("password", 12),
		bcrypt.hash("password", 12),
	]);

	const superAdmin = await prisma.user.create({
		data: {
			fullName: "Rahman Kabir",
			nidNumber: "1000000000",
			email: "superadmin@mail.com",
			phone: "+65 9000 0001",
			passwordHash: h1,
			role: "SUPER_ADMIN",
			isVerified: true,
		},
	});

	const admin = await prisma.user.create({
		data: {
			fullName: "Moshiur Ahmed",
			nidNumber: "2000000000",
			email: "admin@mail.com",
			phone: "+65 9000 0002",
			passwordHash: h2,
			role: "ADMIN",
			isVerified: true,
		},
	});

	const moderator = await prisma.user.create({
		data: {
			fullName: "Tasnim Hossain",
			nidNumber: "3000000000",
			email: "mod@mail.com",
			phone: "+65 9000 0003",
			passwordHash: h3,
			role: "MODERATOR",
			isVerified: true,
		},
	});

	// Regular users — different financial states for testing
	const user = await prisma.user.create({
		data: {
			fullName: "Jakaria Islam",
			nidNumber: "4000000000",
			email: "user@mail.com",
			phone: "+65 9001 0001",
			passwordHash: h4,
			role: "USER",
			isVerified: true,
		},
	});

	const user2 = await prisma.user.create({
		data: {
			fullName: "Mahbubur Rahman",
			nidNumber: "5000000000",
			email: "user2@mail.com",
			phone: "+65 9001 0002",
			passwordHash: h5,
			role: "USER",
			isVerified: true,
		},
	});

	const user3 = await prisma.user.create({
		data: {
			fullName: "Sumaiya Begum",
			nidNumber: "6000000000",
			email: "user3@mail.com",
			phone: "+65 9001 0003",
			passwordHash: h6,
			role: "USER",
			isVerified: true,
		},
	});

	// ── Wallets ───────────────────────────────────────────────────────────────
	await prisma.wallet.create({
		data: { userId: superAdmin.id, balance: 50000 },
	});
	await prisma.wallet.create({ data: { userId: admin.id, balance: 25000 } });
	await prisma.wallet.create({ data: { userId: moderator.id, balance: 5000 } });
	const userWallet = await prisma.wallet.create({
		data: { userId: user.id, balance: 15000 },
	});
	const user2Wallet = await prisma.wallet.create({
		data: { userId: user2.id, balance: 8000 },
	});
	const user3Wallet = await prisma.wallet.create({
		data: { userId: user3.id, balance: 2500 },
	});

	await prisma.walletTransaction.createMany({
		data: [
			{
				walletId: userWallet.id,
				type: "DEPOSIT",
				amount: 15000,
				description: "Initial deposit via bKash",
				balanceBefore: 0,
				balanceAfter: 15000,
			},
			{
				walletId: user2Wallet.id,
				type: "DEPOSIT",
				amount: 10000,
				description: "Bank transfer deposit",
				balanceBefore: 0,
				balanceAfter: 10000,
			},
			{
				walletId: user2Wallet.id,
				type: "SHARE_PURCHASE",
				amount: 2000,
				description: "Purchased 10 shares - Halal Food Chain",
				balanceBefore: 10000,
				balanceAfter: 8000,
			},
			{
				walletId: user3Wallet.id,
				type: "DEPOSIT",
				amount: 2500,
				description: "Nagad deposit",
				balanceBefore: 0,
				balanceAfter: 2500,
			},
		],
	});

	// ── Projects ──────────────────────────────────────────────────────────────
	const project1 = await prisma.project.create({
		data: {
			name: "Singapore Tech Fund 2025",
			description:
				"Diversified technology investment fund targeting Singapore-listed tech companies and startups. Annual dividend 8–12%.",
			totalShares: 1000,
			sharePriceSgd: 600,
			availableShares: 620,
			status: "ACTIVE",
			createdById: superAdmin.id,
		},
	});

	const project2 = await prisma.project.create({
		data: {
			name: "Halal Food Chain Initiative",
			description:
				"Community-owned halal restaurant and food supply chain project across Singapore hawker centres and industrial areas.",
			totalShares: 500,
			sharePriceSgd: 250,
			availableShares: 310,
			status: "ACTIVE",
			createdById: admin.id,
		},
	});

	const project3 = await prisma.project.create({
		data: {
			name: "Probashi Remittance Services",
			description:
				"Low-cost remittance service to Bangladesh using community pooled funds. Target rate: max 0.5% fee.",
			totalShares: 300,
			sharePriceSgd: 350,
			availableShares: 180,
			status: "ACTIVE",
			createdById: superAdmin.id,
		},
	});

	// ── Share Ownerships ──────────────────────────────────────────────────────
	// user  : 10 shares in project1, 5 in project2
	// user2 : 10 shares in project2, 5 in project3
	// user3 : 5 shares in project1

	await prisma.shareOwnership.create({
		data: {
			projectId: project1.id,
			ownerId: user.id,
			quantity: 10,
			purchasePrice: 500.0,
		},
	});
	await prisma.shareOwnership.create({
		data: {
			projectId: project2.id,
			ownerId: user.id,
			quantity: 5,
			purchasePrice: 200.0,
		},
	});
	await prisma.shareOwnership.create({
		data: {
			projectId: project2.id,
			ownerId: user2.id,
			quantity: 10,
			purchasePrice: 200.0,
		},
	});
	await prisma.shareOwnership.create({
		data: {
			projectId: project3.id,
			ownerId: user2.id,
			quantity: 5,
			purchasePrice: 300.0,
		},
	});
	await prisma.shareOwnership.create({
		data: {
			projectId: project1.id,
			ownerId: user3.id,
			quantity: 5,
			purchasePrice: 500.0,
		},
	});

	// ── Share Purchase Requests ───────────────────────────────────────────────
	// PENDING — user3 wants 3 shares in project2
	await prisma.sharePurchaseRequest.create({
		data: {
			buyerId: user3.id,
			projectId: project2.id,
			quantity: 3,
			totalAmount: 600.0,
			paymentMethod: "BKASH",
			txId: "BKS-2026-001",
			status: "PENDING",
		},
	});
	// APPROVED — user bought into project1 previously
	await prisma.sharePurchaseRequest.create({
		data: {
			buyerId: user.id,
			projectId: project1.id,
			quantity: 10,
			totalAmount: 5000.0,
			paymentMethod: "BANK_TRANSFER",
			txId: "BANK-2025-099",
			status: "APPROVED",
			processedById: admin.id,
		},
	});
	// PENDING — user wants more shares in project3
	await prisma.sharePurchaseRequest.create({
		data: {
			buyerId: user.id,
			projectId: project3.id,
			quantity: 2,
			totalAmount: 600.0,
			paymentMethod: "NAGAD",
			txId: "NGD-2026-007",
			status: "PENDING",
		},
	});

	// ── Share Resell Listings ─────────────────────────────────────────────────
	// user wants to sell 3 of their project1 shares at a premium
	const resellListing = await prisma.shareListing.create({
		data: {
			sellerId: user.id,
			projectId: project1.id,
			quantity: 3,
			askingPrice: 550.0, // bought at 500, selling at 550
			status: "PENDING", // admin must approve the listing
		},
	});

	// user2 wants to sell 2 of their project2 shares
	await prisma.shareListing.create({
		data: {
			sellerId: user2.id,
			projectId: project2.id,
			quantity: 2,
			askingPrice: 210.0,
			status: "PENDING",
		},
	});

	// ── Share Trade (user3 wants to buy from user's resell listing) ───────────
	await prisma.shareTrade.create({
		data: {
			listingId: resellListing.id,
			buyerId: user3.id,
			quantity: 2,
			totalAmount: 1100.0,
			paymentMethod: "BKASH",
			txId: "BKS-TRADE-001",
			status: "PENDING",
		},
	});

	// ── Deposit Requests ──────────────────────────────────────────────────────
	await prisma.depositRequest.create({
		data: {
			userId: user.id,
			amount: 5000.0,
			paymentMethod: "BANK_TRANSFER",
			txId: "BANK-TXN-001",
			status: "PENDING",
		},
	});
	await prisma.depositRequest.create({
		data: {
			userId: user2.id,
			amount: 2000.0,
			paymentMethod: "BKASH",
			txId: "BKS-DEP-002",
			status: "APPROVED",
		},
	});
	await prisma.depositRequest.create({
		data: {
			userId: user3.id,
			amount: 1000.0,
			paymentMethod: "NAGAD",
			txId: "NGD-DEP-003",
			status: "PENDING",
		},
	});

	// ── Taxi Vendors ──────────────────────────────────────────────────────────
	const vendor1 = await prisma.taxiVendor.create({
		data: {
			name: "City Cabs Singapore",
			phone: "+6591234567",
			vehicleType: "Sedan",
		},
	});
	await prisma.taxiVendor.create({
		data: {
			name: "Comfort Rides",
			phone: "+6598765432",
			vehicleType: "MPV / Minivan",
		},
	});

	// ── Taxi Requests ─────────────────────────────────────────────────────────
	const taxi1 = await prisma.taxiRequest.create({
		data: {
			userId: user.id,
			pickupLocation: "Block 22, Geylang Lorong 14",
			destination: "Changi Airport Terminal 2",
			date: new Date("2026-06-20T04:30:00Z"),
			passengerCount: 1,
			notes: "Very early morning, please be on time",
			status: "ASSIGNED",
			price: 35.0,
			assignedVendorId: vendor1.id,
		},
	});
	await prisma.taxiRequest.create({
		data: {
			userId: user2.id,
			pickupLocation: "Mustafa Centre, Little India",
			destination: "Jurong East MRT",
			date: new Date("2026-06-18T08:00:00Z"),
			passengerCount: 3,
			status: "CONFIRMED",
			price: 28.0,
			assignedVendorId: vendor1.id,
			adminNote: "Driver: Karim, +65 9123 4567",
		},
	});
	await prisma.taxiRequest.create({
		data: {
			userId: user3.id,
			pickupLocation: "Woodlands Checkpoint",
			destination: "Orchard Road",
			date: new Date("2026-06-25T10:00:00Z"),
			passengerCount: 2,
			status: "PENDING",
		},
	});

	// ── Air Ticket Requests ───────────────────────────────────────────────────
	const airTicket1 = await prisma.airTicketRequest.create({
		data: {
			userId: user.id,
			origin: "Singapore (SIN)",
			destination: "Dhaka (DAC)",
			departDate: new Date("2026-08-15T06:00:00Z"),
			returnDate: new Date("2026-09-01T06:00:00Z"),
			passengers: 1,
			status: "ASSIGNED",
			price: 450.0,
			assignedManagerId: admin.id,
		},
	});
	await prisma.airTicketRequest.create({
		data: {
			userId: user2.id,
			origin: "Singapore (SIN)",
			destination: "Dhaka (DAC)",
			departDate: new Date("2026-07-20T14:00:00Z"),
			passengers: 2,
			status: "PENDING",
		},
	});
	await prisma.airTicketRequest.create({
		data: {
			userId: user3.id,
			origin: "Singapore (SIN)",
			destination: "Dhaka (DAC)",
			departDate: new Date("2026-09-05T10:00:00Z"),
			passengers: 1,
			status: "PENDING",
		},
	});

	// ── Checkout (combined taxi + air ticket payment demo) ───────────────────
	await prisma.checkout.create({
		data: {
			token: "demo-awaiting-payment-token",
			userId: user.id,
			createdById: admin.id,
			subtotal: 485.0,
			discountAmount: 10.0,
			totalAmount: 475.0,
			status: "AWAITING_PAYMENT",
			expiresAt: new Date("2026-09-01T00:00:00Z"),
			items: {
				create: [
					{
						itemType: "TAXI",
						taxiRequestId: taxi1.id,
						description: "Taxi: Geylang → Changi Airport Terminal 2",
						unitPrice: 35.0,
						lineTotal: 35.0,
					},
					{
						itemType: "AIR_TICKET",
						airTicketRequestId: airTicket1.id,
						description: "Flight: Singapore (SIN) → Dhaka (DAC)",
						unitPrice: 450.0,
						lineTotal: 450.0,
					},
				],
			},
		},
	});

	// ── Lost & Found Posts ────────────────────────────────────────────────────
	await prisma.lostFoundPost.createMany({
		data: [
			// LOST posts
			{
				userId: user.id,
				type: "LOST",
				title: "Lost wallet near Mustafa Centre",
				description:
					"Black leather wallet lost near Mustafa Centre, Little India on 12 June. Contains NID card, $80 cash, and bKash card. Please contact if found.",
				location: "Mustafa Centre, Little India",
				images: [],
				status: "OPEN",
			},
			{
				userId: user2.id,
				type: "LOST",
				title: "Lost Samsung Galaxy S24 on MRT",
				description:
					"Lost my Samsung Galaxy S24 (black) on the North-South Line between Woodlands and City Hall on 10 June. Black case with a Bangladesh flag sticker on the back.",
				location: "North-South Line MRT",
				images: [],
				status: "OPEN",
			},
			{
				userId: user3.id,
				type: "LOST",
				title: "Lost gold ring at Geylang Serai Market",
				description:
					"Lost a gold ring (22k) at Geylang Serai Market on 8 June. Sentimental value — wedding ring. Please help.",
				location: "Geylang Serai Market",
				images: [],
				status: "OPEN",
			},
			{
				userId: moderator.id,
				type: "LOST",
				title: "Lost work permit card",
				description:
					"Lost my work permit card near Toa Payoh Bus Interchange. Name: Hossain. Card is blue. Need urgently for work. Contact: +65 9000 0003",
				location: "Toa Payoh Bus Interchange",
				images: [],
				status: "RESOLVED",
			},
			// FOUND posts
			{
				userId: user.id,
				type: "FOUND",
				title: "Found prayer cap and tasbih on bus",
				description:
					"Found a white prayer cap and green tasbih on SBS Bus 65 near Tampines. Kept safely. Owner please contact to collect.",
				location: "SBS Bus 65, Tampines area",
				images: [],
				status: "OPEN",
			},
			{
				userId: user2.id,
				type: "FOUND",
				title: "Found Bangladeshi passport near Farrer Park",
				description:
					"Found a Bangladeshi passport on the footpath near Farrer Park MRT exit B. Contact me immediately to collect safely — do not delay as this is an important document.",
				location: "Farrer Park MRT, Exit B",
				images: [],
				status: "RESOLVED",
			},
			{
				userId: user3.id,
				type: "FOUND",
				title: "Found children's school bag on bench",
				description:
					"Found a small green school bag on a bench at Queenstown MRT. Contains textbooks and pencil box. Looks like a child's bag. Call to collect.",
				location: "Queenstown MRT Station",
				images: [],
				status: "OPEN",
			},
			{
				userId: moderator.id,
				type: "FOUND",
				title: "Found bKash card and cash in taxi",
				description:
					"Found a bKash card and $30 cash in a taxi (plate: SHC1234X). Keeping safely. Owner can describe the items to claim.",
				location: "Taxi SHC1234X, Jurong area",
				images: [],
				status: "OPEN",
			},
		],
	});

	// ── Islamic Content (Duas & Articles) ────────────────────────────────────
	// Only seed if empty so re-running seed doesn't duplicate
	const existingDuas = await prisma.dua.count();
	if (existingDuas === 0) {
		await prisma.dua.createMany({
			data: [
				// ── Prayer (Salah) ──────────────────────────────────────────────────
				{
					title: "Dua before entering prayer (Iftitah)",
					arabic:
						"سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلَهَ غَيْرُكَ",
					transliteration:
						"Subhānaka Allāhumma wa bi-ḥamdika wa tabāraka ismuka wa ta'ālā jadduka wa lā ilāha ghayruk",
					translation:
						"Glory be to You, O Allah, and all praises are due unto You, and blessed is Your name and high is Your majesty and none is worthy of worship but You.",
					category: "Prayer",
					source: "Abu Dawud, Tirmidhi",
				},
				{
					title: "Dua after completing prayer (Tasleem)",
					arabic:
						"اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
					transliteration:
						"Allāhumma anta as-salāmu wa minka as-salāmu tabārakta yā dhal-jalāli wal-ikrām",
					translation:
						"O Allah, You are Peace and from You is peace. Blessed are You, O Owner of majesty and honour.",
					category: "Prayer",
					source: "Muslim",
				},
				{
					title: "Dua going to the Masjid",
					arabic:
						"اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا وَفِي لِسَانِي نُورًا وَفِي بَصَرِي نُورًا",
					transliteration:
						"Allāhummaj'al fī qalbī nūrā wa fī lisānī nūrā wa fī baṣarī nūrā",
					translation:
						"O Allah, place light in my heart, light on my tongue, and light in my sight.",
					category: "Prayer",
					source: "Bukhari, Muslim",
				},
				{
					title: "Dua entering the Masjid",
					arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
					transliteration: "Allāhumma iftaḥ lī abwāba raḥmatik",
					translation: "O Allah, open the gates of Your mercy for me.",
					category: "Prayer",
					source: "Muslim",
				},
				{
					title: "Dua leaving the Masjid",
					arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
					transliteration: "Allāhumma innī as'aluka min faḍlik",
					translation: "O Allah, I ask You of Your bounty.",
					category: "Prayer",
					source: "Muslim",
				},
				// ── Jumma (Friday) ──────────────────────────────────────────────────
				{
					title: "Salawat on the Prophet (for Jumma)",
					arabic:
						"اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ",
					transliteration:
						"Allāhumma ṣalli 'alā Muḥammadin wa 'alā āli Muḥammadin kamā ṣallayta 'alā Ibrāhīma wa 'alā āli Ibrāhīma innaka Ḥamīdun Majīd",
					translation:
						"O Allah, bestow Your prayers upon Muhammad and upon the family of Muhammad, as You bestowed Your prayers upon Ibrahim and upon the family of Ibrahim. Indeed, You are Praiseworthy, Glorious.",
					category: "Jumma",
					source: "Bukhari, Muslim",
				},
				{
					title: "Dua during the last hour of Jumma",
					arabic:
						"اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ الْأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
					transliteration:
						"Allāhumma innī as'aluka bi-annaka anta Allāhu lā ilāha illā anta al-Aḥadu aṣ-Ṣamadu alladhī lam yalid wa lam yūlad wa lam yakun lahu kufuwan aḥad",
					translation:
						"O Allah, I ask You by the fact that You are Allah, there is no god but You, the One, the Self-Sufficient, Who did not beget and was not begotten, and none is comparable to Him.",
					category: "Jumma",
					source: "Abu Dawud, Ibn Majah",
				},
				{
					title: "Recite Surah Al-Kahf on Jumma",
					arabic:
						"مَنْ قَرَأَ سُورَةَ الْكَهْفِ فِي يَوْمِ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ",
					transliteration:
						"Man qara'a Sūratal-Kahfi fī yawmil-Jumu'ati aḍā'a lahu minan-nūri mā baynal-Jumu'atayn",
					translation:
						"Whoever reads Surah Al-Kahf on Friday, a light will shine for him between the two Fridays. (Reminder to recite Surah Al-Kahf every Friday.)",
					category: "Jumma",
					source: "Al-Hakim (authenticated)",
				},
				{
					title: "Dua for the last hour of Friday afternoon",
					arabic:
						"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
					transliteration:
						"Rabbanā ātinā fid-dunyā ḥasanatan wa fil-ākhirati ḥasanatan wa qinā 'adhāban-nār",
					translation:
						"Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
					category: "Jumma",
					source: "Quran 2:201",
				},
				// ── Morning ──────────────────────────────────────────────────────────
				{
					title: "Morning Remembrance — waking up",
					arabic:
						"الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
					transliteration:
						"Alḥamdulillāhil-ladhī aḥyānā ba'da mā amātanā wa ilayhin-nushūr",
					translation:
						"All praise is for Allah who gave us life after having taken it from us, and unto Him is the resurrection.",
					category: "Morning",
					source: "Bukhari",
				},
				{
					title: "Morning Remembrance (Sabah)",
					arabic:
						"أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
					transliteration:
						"Aṣbaḥnā wa aṣbaḥal-mulku lillāhi wal-ḥamdu lillāhi lā ilāha illallāhu waḥdahu lā sharīka lah",
					translation:
						"We have entered a new morning and all sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.",
					category: "Morning",
					source: "Muslim",
				},
				{
					title: "Ayatul Kursi (morning protection)",
					arabic:
						"اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
					transliteration:
						"Allāhu lā ilāha illā huwal-Ḥayyul-Qayyūm lā ta'khudhuhu sinatun wa lā nawm",
					translation:
						"Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep.",
					category: "Morning",
					source: "Quran 2:255",
				},
				// ── Evening ──────────────────────────────────────────────────────────
				{
					title: "Evening Remembrance (Masa)",
					arabic:
						"أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
					transliteration:
						"Amsaynā wa amsal-mulku lillāhi wal-ḥamdu lillāhi lā ilāha illallāhu waḥdahu lā sharīka lah",
					translation:
						"We have entered a new evening and all sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.",
					category: "Evening",
					source: "Muslim",
				},
				{
					title: "Dua before sleeping",
					arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
					transliteration: "Bismika Allāhumma amūtu wa aḥyā",
					translation: "In Your name, O Allah, I die and I live.",
					category: "Sleep",
					source: "Bukhari",
				},
				{
					title: "Dua for forgiveness before sleep",
					arabic:
						"اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا لَكَ مَمَاتُهَا وَمَحْيَاهَا إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا",
					transliteration:
						"Allāhumma innaka khalaqta nafsī wa anta tawaffāhā laka mamātuhā wa maḥyāhā in aḥyaytahā faḥfaẓhā wa in amattahā faghfir lahā",
					translation:
						"O Allah, You created my soul and You will take it back. To You belongs its death and its life. If You keep it alive then protect it, and if You cause it to die then forgive it.",
					category: "Sleep",
					source: "Muslim",
				},
				// ── Food ─────────────────────────────────────────────────────────────
				{
					title: "Dua before eating (Bismillah)",
					arabic: "بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ",
					transliteration: "Bismillāhi wa 'alā barakati-llāh",
					translation: "In the name of Allah and with the blessings of Allah.",
					category: "Food",
					source: "Abu Dawud",
				},
				{
					title: "Dua after eating (Alhamdulillah)",
					arabic:
						"الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
					transliteration:
						"Alḥamdulillāhil-ladhī aṭ'amanā wa saqānā wa ja'alanā muslimīn",
					translation:
						"All praise is for Allah who fed us, gave us drink, and made us Muslims.",
					category: "Food",
					source: "Abu Dawud, Tirmidhi",
				},
				// ── Travel ───────────────────────────────────────────────────────────
				{
					title: "Dua for Travel (Safar)",
					arabic:
						"سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ",
					transliteration:
						"Subḥānal-ladhī sakhkhara lanā hādhā wa mā kunnā lahū muqrinīna wa innā ilā rabbinā lamunqalibūn",
					translation:
						"Glory be to the One Who has subjected this to us, and we were not able to do it ourselves. And indeed, we will return to our Lord.",
					category: "Travel",
					source: "Abu Dawud, Tirmidhi",
				},
				{
					title: "Dua for safe arrival (returning home)",
					arabic: "آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ",
					transliteration: "Āyibūna tā'ibūna 'ābidūna li-rabbinā ḥāmidūn",
					translation:
						"We are returning, repenting, worshipping, and praising our Lord.",
					category: "Travel",
					source: "Muslim",
				},
				// ── Protection ───────────────────────────────────────────────────────
				{
					title: "Dua for Protection (morning & evening)",
					arabic:
						"بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
					transliteration:
						"Bismillāhil-ladhī lā yaḍurru ma'asmihi shay'un fil-arḍi wa lā fis-samā'i wa huwas-Samī'ul-'Alīm",
					translation:
						"In the name of Allah, with Whose name nothing can cause harm on earth or in heaven, and He is the All-Hearing, All-Knowing.",
					category: "Protection",
					source: "Abu Dawud, Tirmidhi",
				},
				{
					title: "Dua for protection from anxiety",
					arabic:
						"اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ وَالْبُخْلِ وَالْجُبْنِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
					transliteration:
						"Allāhumma innī a'ūdhu bika minal-hammi wal-ḥazani wal-'ajzi wal-kasali wal-bukhli wal-jubni wa ḍala'id-dayni wa ghalabatir-rijāl",
					translation:
						"O Allah, I seek refuge in You from anxiety, grief, incapacity, laziness, miserliness, cowardice, the burden of debt and being overpowered by men.",
					category: "Protection",
					source: "Bukhari",
				},
				// ── General ──────────────────────────────────────────────────────────
				{
					title: "Istighfar (seeking forgiveness)",
					arabic:
						"أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
					transliteration:
						"Astaghfirullāhal-ladhī lā ilāha illā huwal-Ḥayyul-Qayyūmu wa atūbu ilayh",
					translation:
						"I seek forgiveness from Allah, besides Whom there is none worthy of worship, the Ever Living, the Eternal, and I repent to Him.",
					category: "General",
					source: "Abu Dawud, Tirmidhi",
				},
				{
					title: "Dua for parents",
					arabic: "رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
					transliteration: "Rabbir-ḥamhumā kamā rabbayānī ṣaghīrā",
					translation:
						"My Lord, have mercy upon them as they raised me when I was small.",
					category: "General",
					source: "Quran 17:24",
				},
				{
					title: "Dua for guidance (Ihdina)",
					arabic:
						"اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
					transliteration:
						"Ihdinā aṣ-ṣirāṭal-mustaqīm ṣirāṭal-ladhīna an'amta 'alayhim ghayril-maghḍūbi 'alayhim wa laḍ-ḍāllīn",
					translation:
						"Guide us to the straight path — the path of those upon whom You have bestowed favour, not of those who have evoked anger or of those who are astray.",
					category: "General",
					source: "Quran 1:6-7",
				},
			],
		});
		console.log("  ✓ Seeded duas");
	}

	const existingArticles = await prisma.islamicArticle.count();
	if (existingArticles === 0) {
		// Need an admin user ID — use superAdmin created above
		await prisma.islamicArticle.createMany({
			data: [
				{
					title: "Prayer Times in Singapore — Complete Guide",
					excerpt:
						"Daily Fajr, Dhuhr, Asr, Maghrib and Isha times for Singapore, and the nearest mosques for Bangladeshi workers in every district.",
					content: `Singapore is a Muslim-friendly city with MUIS (Islamic Religious Council of Singapore) officially publishing daily prayer times. Here is what every Bangladeshi worker in Singapore needs to know.

**Daily Prayer Times (approximate — check MUIS app for exact times)**
- Fajr (Subh): ~5:30–6:00 AM (before sunrise)
- Dhuhr (Zohr): ~1:00–1:15 PM
- Asr: ~4:15–4:30 PM
- Maghrib: ~7:10–7:20 PM (at sunset)
- Isha: ~8:20–8:30 PM

**How to get exact times**
Download the official MUIS app or visit muis.gov.sg. Times shift slightly each day. Singapore's latitude means prayer times are fairly consistent year-round.

**Mosques near Bangladeshi work areas**
- Little India / Mustafa Centre: Abdul Gafoor Mosque (Dunlop Street)
- Jurong Industrial Area: Masjid An-Nur (Woodlands), Masjid Al-Ansar (Bedok)
- Toa Payoh: Masjid Assyakirin
- Woodlands: Masjid Petempatan Melayu Sembawang
- Geylang: Masjid Khalid (Geylang Road)

**Tips for workers**
- Many workplaces allow a 10–15 minute break for Dhuhr and Asr. Communicate with your supervisor.
- Carry a prayer mat (sejadah) in your bag.
- Use the Athan app for automatic adhan reminders on your phone.`,
					authorId: superAdmin.id,
					status: "PUBLISHED",
				},
				{
					title: "Jumu'ah (Friday Prayer) — Mosques Guide for Singapore",
					excerpt:
						"Where to attend Friday prayer near your workplace in Singapore. Mosques across Jurong, Woodlands, Geylang, Toa Payoh and more.",
					content: `Friday (Jumu'ah) prayer is obligatory for every adult Muslim male. In Singapore, Jumu'ah prayers typically start between 12:15 PM and 1:30 PM depending on the mosque.

**What to do on Jumma**
1. Take a ritual bath (ghusl) in the morning if possible
2. Wear clean clothes — white is recommended but not mandatory
3. Recite Surah Al-Kahf (or as much as you can)
4. Send abundant Salawat (blessings) on the Prophet ﷺ
5. Go early — mosques fill up quickly on Fridays

**Key mosques by area**
- **Jurong / Tuas**: Masjid An-Nur (Woodlands Rd), Masjid Al-Istiqamah (Bukit Timah)
- **Little India / Mustafa**: Abdul Gafoor Mosque, Masjid Bencoolen
- **Geylang / Paya Lebar**: Masjid Khalid, Masjid Darul Aman
- **Tampines / Pasir Ris**: Masjid Darul Ghufran, Masjid Al-Ansar
- **Toa Payoh / Bishan**: Masjid Assyakirin
- **Woodlands / Sembawang**: Masjid Petempatan Melayu Sembawang

**Khutbah language**
Most mosques deliver the Khutbah (sermon) in Malay and English. Some mosques in Little India also offer Tamil. The core Arabic content is the same in all mosques.

**Tip**: Arrive 20–30 minutes early to get a spot inside the main prayer hall. Bring your own prayer mat on busy weeks like Eid preparations.`,
					authorId: superAdmin.id,
					status: "PUBLISHED",
				},
				{
					title: "Ramadan in Singapore — A Guide for Bangladeshi Workers",
					excerpt:
						"Fasting hours, Taraweeh mosques, halal iftar options, and how to observe Ramadan while working in Singapore.",
					content: `Ramadan in Singapore is a beautiful experience. The city is Muslim-friendly, and fasting while working is manageable with the right preparation.

**Fasting Hours in Singapore**
Singapore is close to the equator, so fasting hours are consistent throughout the year — typically 13–14 hours from Suhoor to Iftar, with no extreme long summer fasts.

**Suhoor (pre-dawn meal)**
Wake up before Fajr (around 5:30 AM) for Suhoor. Many 24-hour kopitiam (coffee shops) and halal eateries near Little India and Geylang serve meals from 4 AM during Ramadan.

**Iftar (breaking fast)**
Iftar is at Maghrib (around 7:15 PM in Singapore). The entire Little India and Geylang area transforms during Ramadan with bazaars selling Bangladeshi food, murtabak, dates, and more. Geylang Serai Ramadan Bazaar is the most famous.

**Taraweeh Prayers**
Most mosques offer 8 or 20 rakah Taraweeh after Isha. Check your nearest mosque's schedule.

**Zakat and Fidyah**
Pay your Zakat Fitrah before Eid prayers. MUIS sets the official rate each year. You can pay at any mosque or via the MUIS website.

**Work tips during Ramadan**
- Inform your employer you are fasting
- Stay hydrated between Iftar and Suhoor
- Eat nutritious Suhoor meals — rice, eggs, oats
- Many Bangladeshi workers take annual leave during the last 10 days of Ramadan`,
					authorId: superAdmin.id,
					status: "PUBLISHED",
				},
				{
					title:
						"Halal Food in Singapore — What Every Muslim Worker Should Know",
					excerpt:
						"How MUIS halal certification works, how to identify halal food, and the best areas for halal meals near Bangladeshi communities.",
					content: `Singapore has one of the most reliable halal food certification systems in the world, run by MUIS (Majlis Ugama Islam Singapura).

**MUIS Halal Certification**
- Look for the official MUIS halal logo (a green crescent with "MUIS" text)
- Many hawker centres have dedicated halal stalls — look for the sign above the stall
- Major supermarkets (NTUC FairPrice, Giant, Cold Storage) clearly label halal products

**Is Muslim-owned automatically halal?**
No. A restaurant or stall run by a Muslim may still serve non-halal items or use shared cooking equipment. Always look for the official MUIS cert.

**Best areas for halal food near Bangladeshi workers**
- **Little India**: Dozens of Bangladeshi, Indian Muslim, and Malay restaurants. Mutton biryani, roti prata available all day.
- **Geylang**: Nasi padang, murtabak, seafood — many halal options
- **Woodlands**: Malay food courts with halal certification
- **Jurong East**: Sun Plaza food court has certified halal options

**Common halal-certified food chains in Singapore**
- McDonald's (certified halal)
- KFC (certified halal)
- Subway (certain outlets — check the cert)
- Burger King (certain outlets)

**Free app**: Download the "Halal SG" app or use the MUIS halal directory at muis.gov.sg/halal to verify any outlet before eating.`,
					authorId: superAdmin.id,
					status: "PUBLISHED",
				},
				{
					title: "Important Duas for Daily Life as a Muslim Worker Abroad",
					excerpt:
						"Compilation of essential duas for morning, evening, workplace, and difficult times — to keep your faith strong while working away from home.",
					content: `Being far from home and family is a test. These duas, when recited with sincerity, help maintain spiritual strength throughout the day.

**Starting the day**
Begin every morning by saying "Alhamdulillah" for waking up. Recite Ayatul Kursi (Al-Baqarah 2:255) for protection through the day. The morning adhkar (remembrances) from the Sunnah take only 5–10 minutes and bring tremendous barakah.

**At the workplace**
Before starting any task, say "Bismillah" (In the name of Allah). When something goes wrong, say "Inna lillahi wa inna ilayhi raji'un" (Indeed we belong to Allah and to Him we shall return). When completing work, say "Alhamdulillah."

**Dua for rizq (provision)**
"Allāhumma innī as'aluka 'ilman nāfi'an wa rizqan ṭayyiban wa 'amalan mutaqabbalan."
O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.

**When facing hardship**
Recite "La hawla wa la quwwata illa billah" (There is no power nor might except with Allah). This is a treasure from the treasures of Paradise (Bukhari).

**Sending money home**
When making remittances, make dua that Allah puts barakah in the money and that it reaches your family safely. This act of providing for your family is sadaqah (charity) and earns reward.

**End of the day**
Complete your evening adhkar, pray Isha, and sleep in a state of wudu. This routine, even when exhausted, keeps the heart connected to Allah while living far from home.`,
					authorId: superAdmin.id,
					status: "PUBLISHED",
				},
			],
		});
		console.log("  ✓ Seeded Islamic articles");
	}

	// ── Blog Categories ───────────────────────────────────────────────────────
	await prisma.blogCategory.createMany({
		data: [
			{ name: "Community News", slug: "community-news" },
			{ name: "Financial Tips", slug: "financial-tips" },
			{ name: "Singapore Life", slug: "singapore-life" },
			{ name: "Travel & Home", slug: "travel-home" },
			{ name: "Islamic Corner", slug: "islamic-corner" },
		],
	});

	// ── Notifications ─────────────────────────────────────────────────────────
	await prisma.notification.createMany({
		data: [
			{
				userId: user.id,
				title: "Deposit Approved",
				message:
					"Your deposit of $15,000 has been approved and credited to your wallet.",
				type: "WALLET",
				isRead: true,
			},
			{
				userId: user.id,
				title: "Share Purchase Approved",
				message:
					"Your purchase of 10 shares in Singapore Tech Fund 2025 has been approved.",
				type: "PURCHASE",
				isRead: true,
			},
			{
				userId: user.id,
				title: "New Deposit Request Pending",
				message:
					"Your deposit request of $5,000 is under review. We'll update you within 2–4 hours.",
				type: "WALLET",
				isRead: false,
			},
			{
				userId: user.id,
				title: "Share Resell Listing Submitted",
				message:
					"Your request to sell 3 shares in Singapore Tech Fund 2025 at $550 each is pending admin approval.",
				type: "TRADE",
				isRead: false,
			},
			{
				userId: user2.id,
				title: "Deposit Approved",
				message: "Your deposit of $2,000 via bKash has been approved.",
				type: "WALLET",
				isRead: true,
			},
			{
				userId: user2.id,
				title: "Ticket Booking Pending",
				message:
					"Your booking for Singapore Airlines SIN→DAC (2 passengers) is under review.",
				type: "SYSTEM",
				isRead: false,
			},
			{
				userId: user3.id,
				title: "Welcome to Singapur Probashi!",
				message:
					"Your account has been verified. You can now deposit funds and invest in community projects.",
				type: "SYSTEM",
				isRead: false,
			},
			{
				userId: user3.id,
				title: "Share Purchase Request Submitted",
				message:
					"Your request to buy 3 shares in Halal Food Chain Initiative is pending admin approval.",
				type: "PURCHASE",
				isRead: false,
			},
		],
	});

	// ── Apply Services ────────────────────────────────────────────────────────
	await prisma.applyService.createMany({
		data: [
			{
				name: "Resume / CV Creation",
				description:
					"Professional resume writing tailored for Singapore job market. Includes formatting, highlights, and English proofreading.",
				price: 30.0,
				isActive: true,
				sortOrder: 1,
			},
			{
				name: "ePassport Assistance",
				description:
					"End-to-end assistance with Bangladesh ePassport application while in Singapore. Form filling, document verification, and submission guidance.",
				price: 50.0,
				isActive: true,
				sortOrder: 2,
			},
		],
	});
	console.log("  ✓ Seeded 2 apply services");

	// ── Done ──────────────────────────────────────────────────────────────────
	console.log("\n✅  Seed complete!\n");
	console.log("┌───────────────────────────────────────────────────────┐");
	console.log("│                  TEST CREDENTIALS                    │");
	console.log("├─────────────┬────────────────────────┬───────────────┤");
	console.log("│ Role        │ Email                  │ Password      │");
	console.log("├─────────────┼────────────────────────┼───────────────┤");
	console.log("│ SUPER_ADMIN │ superadmin@mail.com    │ password      │");
	console.log("│ ADMIN       │ admin@mail.com         │ password      │");
	console.log("│ MODERATOR   │ mod@mail.com           │ password      │");
	console.log("│ USER        │ user@mail.com          │ password      │");
	console.log("│ USER        │ user2@mail.com         │ password      │");
	console.log("│ USER        │ user3@mail.com         │ password      │");
	console.log("└─────────────┴────────────────────────┴───────────────┘");
	console.log("\n  Seeded:  3 projects  |  5 share ownerships");
	console.log(
		"           3 purchase requests  |  2 resell listings  |  1 trade",
	);
	console.log(
		"           2 taxi vendors  |  3 taxi requests  |  3 air ticket requests",
	);
	console.log("           3 deposit requests  |  1 checkout");
	console.log("           8 lost & found posts  |  8 notifications");
	console.log("           2 apply services\n");
}

main()
	.catch((e) => {
		console.error("❌  Seed failed:", e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
