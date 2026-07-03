import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkflow() {
  console.log('🚀 Testing Gate Pass Workflow\n');

  // Create JWT token
  const token = jwt.sign(
    { userId: 1, organizationId: 1, role: 'ADMIN' },
    'secret',
    { expiresIn: '1h' },
  );

  // Test 1: Create a bill (which should auto-generate gate passes)
  console.log('1️⃣  Creating a bill...');
  const billPayload = {
    customerId: 1,
    channel: 'COUNTER',
    payment_method: 'CASH',
    lines: [
      { productId: 1, warehouseId: 1, quantity: 5, unit_price: 50000 },
      { productId: 2, warehouseId: 1, quantity: 10, unit_price: 3000 },
    ],
  };

  const billResponse = await fetch('http://localhost:3000/bills', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(billPayload),
  });

  if (!billResponse.ok) {
    console.error('❌ Bill creation failed:', await billResponse.text());
    return;
  }

  const bill = await billResponse.json();
  console.log(`✅ Bill created: ${bill.bill_number}`);
  console.log(`   Total amount: Rs. ${bill.total_amount / 100}`);
  console.log(`   Bill ID: ${bill.id}\n`);

  // Test 2: Fetch gate passes
  console.log('2️⃣  Fetching pending gate passes...');
  const gatePassResponse = await fetch(
    'http://localhost:3000/gate-passes?warehouseId=1',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  if (!gatePassResponse.ok) {
    console.error('❌ Gate pass fetch failed:', await gatePassResponse.text());
    return;
  }

  const gatePasses = await gatePassResponse.json();
  console.log(`✅ Gate passes found: ${gatePasses.total}`);

  if (gatePasses.data.length === 0) {
    console.error('❌ No gate passes created!');
    return;
  }

  const gatePass = gatePasses.data[0];
  console.log(`   Gate Pass Number: ${gatePass.gate_pass_number}`);
  console.log(`   Status: ${gatePass.status}`);
  console.log(`   Items in gate pass:`);

  for (const item of gatePass.items) {
    console.log(
      `     - ${item.billLine.product.name}: ${item.quantity} units`,
    );
  }

  // Test 3: Check inventory before confirm
  console.log(`\n3️⃣  Checking inventory before confirmation...`);
  const inventoryBefore = await prisma.inventory.findFirst({
    where: { productId: 1, warehouseId: 1 },
  });
  console.log(`   Product 1 - Physical: ${inventoryBefore.physical_on_hand}, Reserved: ${inventoryBefore.reserved}, Available: ${inventoryBefore.available}`);

  // Test 4: Confirm gate pass (pick items)
  console.log(`\n4️⃣  Confirming gate pass (picking items)...`);
  const confirmPayload = {
    pickedItems: gatePass.items.map((item) => ({
      billLineId: item.billLineId,
      pickedQuantity: item.quantity,
    })),
    remarks: 'All items picked successfully',
  };

  const confirmResponse = await fetch(
    `http://localhost:3000/gate-passes/${gatePass.id}/confirm`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(confirmPayload),
    },
  );

  if (!confirmResponse.ok) {
    console.error('❌ Gate pass confirm failed:', await confirmResponse.text());
    return;
  }

  const confirmedGatePass = await confirmResponse.json();
  console.log(`✅ Gate pass confirmed`);
  console.log(`   Status: ${confirmedGatePass.status}`);
  console.log(`   Confirmed by: User ${confirmedGatePass.confirmed_by}\n`);

  // Test 5: Check inventory after confirm
  console.log('5️⃣  Checking inventory after confirmation...');
  const inventoryAfter = await prisma.inventory.findFirst({
    where: { productId: 1, warehouseId: 1 },
  });
  console.log(
    `   Product 1 - Physical: ${inventoryAfter.physical_on_hand}, Reserved: ${inventoryAfter.reserved}, Available: ${inventoryAfter.available}`,
  );
  console.log(
    `   ✅ Physical decreased by: ${inventoryBefore.physical_on_hand - inventoryAfter.physical_on_hand}`,
  );
  console.log(
    `   ✅ Reserved decreased by: ${inventoryBefore.reserved - inventoryAfter.reserved}`,
  );

  // Test 6: Test rejection workflow
  console.log(`\n6️⃣  Testing rejection workflow...`);

  // Create another bill
  const bill2Response = await fetch('http://localhost:3000/bills', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      customerId: 1,
      channel: 'COUNTER',
      payment_method: 'CASH',
      lines: [{ productId: 2, warehouseId: 1, quantity: 3, unit_price: 3000 }],
    }),
  });

  const bill2 = await bill2Response.json();
  console.log(`   Created bill: ${bill2.bill_number}`);

  // Get the new gate pass
  const gatePass2Response = await fetch(
    'http://localhost:3000/gate-passes?warehouseId=1&skip=0&take=1',
    {
      headers: { 'Authorization': `Bearer ${token}` },
    },
  );

  const gatePasses2 = await gatePass2Response.json();
  const gatePass2 = gatePasses2.data.find((gp) => gp.status === 'PENDING');

  if (gatePass2) {
    console.log(`   Gate pass to reject: ${gatePass2.gate_pass_number}`);

    const inventoryBefore2 = await prisma.inventory.findFirst({
      where: { productId: 2, warehouseId: 1 },
    });

    const rejectResponse = await fetch(
      `http://localhost:3000/gate-passes/${gatePass2.id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Product damaged, unable to fulfill' }),
      },
    );

    if (!rejectResponse.ok) {
      console.error('❌ Reject failed:', await rejectResponse.text());
    } else {
      const rejectedGatePass = await rejectResponse.json();
      console.log(`   ✅ Gate pass rejected`);
      console.log(`   Status: ${rejectedGatePass.status}`);

      const inventoryAfter2 = await prisma.inventory.findFirst({
        where: { productId: 2, warehouseId: 1 },
      });

      console.log(
        `   ✅ Inventory released - Available increased by: ${inventoryAfter2.available - inventoryBefore2.available}`,
      );
    }
  }

  console.log('\n✅ All tests completed!\n');
  await prisma.$disconnect();
}

testWorkflow().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
