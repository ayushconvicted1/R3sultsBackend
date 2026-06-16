const path = require('path');

// Mock prisma client
const mockTx = {
  userAddress: {
    deleteMany: (q) => {
      console.log('  -> userAddress.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  member: {
    deleteMany: (q) => {
      console.log('  -> member.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  group: {
    findMany: (q) => {
      console.log('  -> group.findMany called with:', q);
      return Promise.resolve([{ id: 'group-1' }]);
    },
    deleteMany: (q) => {
      console.log('  -> group.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  notification: {
    deleteMany: (q) => {
      console.log('  -> notification.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  subscription: {
    deleteMany: (q) => {
      console.log('  -> subscription.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  userLocation: {
    deleteMany: (q) => {
      console.log('  -> userLocation.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  locationSharing: {
    deleteMany: (q) => {
      console.log('  -> locationSharing.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  locationHistory: {
    deleteMany: (q) => {
      console.log('  -> locationHistory.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  geofenceEvent: {
    deleteMany: (q) => {
      console.log('  -> geofenceEvent.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  geofence: {
    findMany: (q) => {
      console.log('  -> geofence.findMany called with:', q);
      return Promise.resolve([{ id: 'gf-1' }]);
    },
    deleteMany: (q) => {
      console.log('  -> geofence.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  propertyPhoto: {
    deleteMany: (q) => {
      console.log('  -> propertyPhoto.deleteMany called with:', q);
      return Promise.resolve({ count: 1 });
    }
  },
  user: {
    update: (q) => {
      console.log('  -> user.update called with:', q);
      return Promise.resolve({ id: q.where.id });
    }
  }
};

const mockPrisma = {
  $transaction: async (fn) => {
    console.log('Starting transaction mock...');
    return await fn(mockTx);
  }
};

// Insert mock into require.cache
const prismaPath = path.resolve(__dirname, '../src/lib/prisma.js');
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: mockPrisma
};

// Now load authController
const authController = require('../src/controllers/authController');

// Test deleteAccount
async function runTest() {
  console.log('==================================================');
  console.log('Testing deleteAccount controller logic...');
  console.log('==================================================');
  const req = {
    user: { id: 'test-user-12345' }
  };
  const res = {
    json: (data) => {
      console.log('\nSuccess response received:', data);
      if (data.success && data.message.includes('permanently deleted')) {
        console.log('\n✅ SUCCESS: deleteAccount function logic executes and completes successfully!');
      } else {
        console.error('\n❌ FAILED: Unexpected response data:', data);
        process.exit(1);
      }
    }
  };
  const next = (err) => {
    console.error('\n❌ FAILED: Error callback invoked in controller:', err);
    process.exit(1);
  };

  try {
    await authController.deleteAccount(req, res, next);
  } catch (error) {
    console.error('\n❌ FAILED: Crash during execution:', error);
    process.exit(1);
  }
}

runTest();
