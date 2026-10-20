import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Market Manager database seeding...");

  // 1. Create Primary Admin User (NAZRUL)
  const nazrulHash = await bcrypt.hash("NAZRUL", 10);
  const nazrulUser = await prisma.user.upsert({
    where: { email: "nazrul@marketmanager.com" },
    update: {},
    create: {
      name: "NAZRUL",
      email: "nazrul@rentpro.internal",
      passwordHash: nazrulHash,
      role: "ADMIN",
      locale: "bn",
    },
  });
  console.log("✅ Super Admin user ready:", nazrulUser.name);

  // Clean up demo admin if exists
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: "admin@marketmanager.com" },
        { name: "প্রশাসক (Admin)" },
      ],
    },
  });

  // 2. Create Charge Types
  const chargeTypesData = [
    { name_en: "Electricity", name_bn: "বিদ্যুৎ বিল", isRecurring: false, defaultAmount: 0 },
    { name_en: "Water Service", name_bn: "পানির বিল", isRecurring: true, defaultAmount: 50000 }, // 500 BDT
    { name_en: "Service Charge", name_bn: "সার্ভিস চার্জ", isRecurring: true, defaultAmount: 100000 }, // 1000 BDT
    { name_en: "Generator Backup", name_bn: "জেনারেটর ব্যাকআপ", isRecurring: true, defaultAmount: 30000 }, // 300 BDT
  ];

  const chargeTypes = [];
  for (const ct of chargeTypesData) {
    const created = await prisma.chargeType.create({
      data: ct,
    });
    chargeTypes.push(created);
  }
  console.log(`✅ Created ${chargeTypes.length} charge types.`);

  // 3. Create Expense Categories
  const expenseCategoriesData = [
    { name_en: "Guard Salary", name_bn: "দারোয়ান বেতন", icon: "Shield", color: "#0284c7" },
    { name_en: "Staff Salary", name_bn: "স্টাফ বেতন", icon: "Users", color: "#0d9488" },
    { name_en: "Repairing & Maintenance", name_bn: "মেরামত ও রক্ষণাবেক্ষণ", icon: "Wrench", color: "#ea580c" },
    { name_en: "Electricity Bill", name_bn: "বিদ্যুৎ বিল (সাধারণ)", icon: "Zap", color: "#eab308" },
    { name_en: "Water & Sewerage", name_bn: "পানি ও পয়ঃনিষ্কাশন", icon: "Droplets", color: "#06b6d4" },
    { name_en: "Cleaning & Sanitation", name_bn: "পরিচ্ছন্নতা খরচ", icon: "Building2", color: "#8b5cf6" },
  ];

  const categories = [];
  for (const cat of expenseCategoriesData) {
    const created = await prisma.expenseCategory.create({
      data: cat,
    });
    categories.push(created);
  }
  console.log(`✅ Created ${categories.length} expense categories.`);

  // 4. Create 3 Markets
  const marketsData = [
    {
      name: "গুলশান প্লাজা শপিং কমপ্লেক্স (Gulshan Plaza)",
      address: "প্লট ১২, গুলশান-১ বাণিজ্যিক এলাকা, ঢাকা-১২১২",
      notes: "৩ তলা বিশিষ্ট শীতাতপ নিয়ন্ত্রিত আধুনিক শপিং মল।",
    },
    {
      name: "উত্তরা সিটি মার্কেট (Uttara City Market)",
      address: "রোড ৪, সেক্টর ৩, উত্তরা, ঢাকা-১২৩০",
      notes: "জেনারেল রিটেইল ও ক্লথিং মার্কেট।",
    },
    {
      name: "ধানমন্ডি ট্রেড সেন্টার (Dhanmondi Trade Center)",
      address: "২৭ মিরপুর রোড, ধানমন্ডি, ঢাকা-১২০৫",
      notes: "ইলেকট্রনিক্স ও গ্যাজেট সামগ্রীর মার্কেট।",
    },
  ];

  const tenantNames = [
    { name: "আব্দুল করিম", phone: "01711223344", nid: "19882691234567890" },
    { name: "মো: রফিকুল ইসলাম", phone: "01822334455", nid: "19852691234567891" },
    { name: "তানভীর আহমেদ", phone: "01933445566", nid: "19902691234567892" },
    { name: "নুরুল হক", phone: "01644556677", nid: "19782691234567893" },
    { name: "সাব্বির হোসেন", phone: "01755667788", nid: "19922691234567894" },
    { name: "মেহেদী হাসান", phone: "01866778899", nid: "19892691234567895" },
    { name: "ফারহানা আক্তার", phone: "01977889900", nid: "19942691234567896" },
    { name: "মো: জসিম উদ্দিন", phone: "01788990011", nid: "19832691234567897" },
    { name: "কামরুল ইসলাম", phone: "01899001122", nid: "19872691234567898" },
    { name: "আনিসুর রহমান", phone: "01900112233", nid: "19812691234567899" },
    { name: "সাইফুল ইসলাম", phone: "01712345670", nid: "19932691234567810" },
    { name: "মাহমুদুল হাসান", phone: "01823456781", nid: "19862691234567811" },
    { name: "শাহিন আলম", phone: "01934567892", nid: "19912691234567812" },
    { name: "নাজমুল হুদা", phone: "01645678903", nid: "19842691234567813" },
    { name: "তারেক মাহমুদ", phone: "01756789014", nid: "19952691234567814" },
    { name: "মো: কামরুজ্জামান", phone: "01867890125", nid: "19822691234567815" },
    { name: "আরিফুর রহমান", phone: "01978901236", nid: "19902691234567816" },
    { name: "হুমায়ুন কবির", phone: "01789012347", nid: "19792691234567817" },
    { name: "রেজাউল করিম", phone: "01890123458", nid: "19882691234567818" },
    { name: "শাহাদাত হোসেন", phone: "01901234569", nid: "19922691234567819" },
  ];

  let tenantCounter = 0;
  const currentMonth = 10;
  const currentYear = 2026;

  for (let mIdx = 0; mIdx < marketsData.length; mIdx++) {
    const mData = marketsData[mIdx];
    const market = await prisma.market.create({
      data: mData,
    });

    console.log(`🏢 Seeding market: ${market.name}`);

    // Create 20 shops for this market
    for (let sIdx = 1; sIdx <= 20; sIdx++) {
      let floor = "Ground";
      let shopNumber = "";
      let rentBDT = 18000;

      if (sIdx <= 6) {
        floor = "Ground";
        shopNumber = `G-${String(sIdx).padStart(2, "0")}`;
        rentBDT = 25000; // 25,000 BDT
      } else if (sIdx <= 12) {
        floor = "1st Floor";
        shopNumber = `1${String(sIdx - 6).padStart(2, "0")}`;
        rentBDT = 20000; // 20,000 BDT
      } else if (sIdx <= 17) {
        floor = "2nd Floor";
        shopNumber = `2${String(sIdx - 12).padStart(2, "0")}`;
        rentBDT = 16000; // 16,000 BDT
      } else {
        floor = "3rd Floor";
        shopNumber = `3${String(sIdx - 17).padStart(2, "0")}`;
        rentBDT = 12000; // 12,000 BDT
      }

      // Shop 19 & 20 are VACANT in some markets to test vacant filter
      const isOccupied = !(mIdx === 1 && sIdx >= 19) && !(mIdx === 2 && sIdx === 20);
      const defaultRentPaisa = rentBDT * 100;

      const shop = await prisma.shop.create({
        data: {
          marketId: market.id,
          shopNumber,
          floor,
          size: `${180 + (sIdx % 4) * 40} sqft`,
          defaultRent: defaultRentPaisa,
          status: isOccupied ? "OCCUPIED" : "VACANT",
        },
      });

      if (isOccupied) {
        const tenantInfo = tenantNames[tenantCounter % tenantNames.length];
        tenantCounter++;

        const tenant = await prisma.tenant.create({
          data: {
            shopId: shop.id,
            name: tenantInfo.name,
            phone: tenantInfo.phone,
            nid: tenantInfo.nid,
            advanceDeposit: defaultRentPaisa * 3, // 3 months advance
            rentAmount: defaultRentPaisa,
            startDate: new Date("2025-01-01"),
          },
        });

        // Add rent history entry
        await prisma.rentHistory.create({
          data: {
            shopId: shop.id,
            tenantId: tenant.id,
            rentAmount: defaultRentPaisa,
            effectiveFrom: new Date("2025-01-01"),
            note: "Initial lease agreement",
          },
        });

        // Generate Bill for Current Month (October 2026)
        // Set realistic distribution: 15 paid, 5 due or partial
        let billStatus = "PAID";
        let paidRatio = 1.0;

        if (sIdx % 4 === 0) {
          billStatus = "DUE";
          paidRatio = 0.0;
        } else if (sIdx === 7 || sIdx === 15) {
          billStatus = "PARTIAL";
          paidRatio = 0.5;
        }

        const utilityPaisa = 150000; // 1500 BDT for water and service charge
        const totalAmountPaisa = defaultRentPaisa + utilityPaisa;
        const paidAmountPaisa = Math.round(totalAmountPaisa * paidRatio);
        const dueAmountPaisa = totalAmountPaisa - paidAmountPaisa;

        const bill = await prisma.bill.create({
          data: {
            shopId: shop.id,
            tenantId: tenant.id,
            month: currentMonth,
            year: currentYear,
            rentAmount: defaultRentPaisa,
            totalAmount: totalAmountPaisa,
            paidAmount: paidAmountPaisa,
            dueAmount: dueAmountPaisa,
            status: billStatus,
            dueDate: new Date(currentYear, currentMonth - 1, 10),
          },
        });

        // Add bill items
        await prisma.billItem.create({
          data: {
            billId: bill.id,
            chargeTypeId: chargeTypes[1].id, // Water
            description: "মাসিক পানির বিল",
            amount: 50000,
          },
        });

        await prisma.billItem.create({
          data: {
            billId: bill.id,
            chargeTypeId: chargeTypes[2].id, // Service Charge
            description: "মার্কেট সার্ভিস ও নিরাপত্তা চার্জ",
            amount: 100000,
          },
        });

        // If paid or partial, add payment record
        if (paidAmountPaisa > 0) {
          const paymentMethods = ["CASH", "BKASH", "NAGAD", "BANK"];
          const method = paymentMethods[sIdx % paymentMethods.length];

          await prisma.payment.create({
            data: {
              billId: bill.id,
              amount: paidAmountPaisa,
              paidOn: new Date(currentYear, currentMonth - 1, 5 + (sIdx % 4)),
              method,
              reference: method === "CASH" ? undefined : `TRX-${currentYear}${currentMonth}-${sIdx}947`,
              receivedBy: "ম্যানেজার",
              note: billStatus === "PAID" ? "পূর্ণ ভাড়া পরিশোধ" : "আংশিক জমা",
            },
          });
        }
      }
    }

    // Add Expenses for this market for 3 months (Aug, Sep, Oct 2026)
    const months = [8, 9, 10];
    for (const mo of months) {
      // Guard Salary
      await prisma.expense.create({
        data: {
          marketId: market.id,
          categoryId: categories[0].id,
          amount: 2400000, // 24,000 BDT
          date: new Date(currentYear, mo - 1, 1),
          description: "২ জন নিরাপত্তা প্রহরীর মাসিক বেতন",
          paymentMethod: "BANK",
        },
      });

      // Staff Salary
      await prisma.expense.create({
        data: {
          marketId: market.id,
          categoryId: categories[1].id,
          amount: 1800000, // 18,000 BDT
          date: new Date(currentYear, mo - 1, 2),
          description: "কেয়ারটেকার ও সহকারী স্টাফ বেতন",
          paymentMethod: "BANK",
        },
      });

      // Electricity Bill
      await prisma.expense.create({
        data: {
          marketId: market.id,
          categoryId: categories[3].id,
          amount: 1550000 + (mIdx * 300000), // ~15,500 - 21,500 BDT
          date: new Date(currentYear, mo - 1, 12),
          description: "কমন স্পেস ও সিঁড়ির বিদ্যুৎ বিল",
          paymentMethod: "BKASH",
        },
      });

      // Maintenance / Cleaning
      await prisma.expense.create({
        data: {
          marketId: market.id,
          categoryId: categories[2].id,
          amount: 650000, // 6,500 BDT
          date: new Date(currentYear, mo - 1, 18),
          description: "জেনারেটর সার্ভিসিং ও সাধারণ রক্ষণাবেক্ষণ",
          paymentMethod: "CASH",
        },
      });
    }
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
