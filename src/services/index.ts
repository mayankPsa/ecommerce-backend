import authRoutes from './auth/routes';
import userRoutes from './user/routes';
import categoryRoutes from './category/routes';
import subCategoryRoutes from './subcategory/routes';
import adminPartnerRoutes from './admin/partner/routes'
import partnerRoutes from './partner/routes'
import deliveryOptionsRoutes from './deliveryOptions/routes'
import customerAddressRoutes from './customerAdress/routes'
import customerOrderRoutes from './customerOrder/routes'
import adminSettings from './admin/settings/routes'
import transactions from './transaction/routes'
import partnerOrders from './partnerOrder/routes'
import mayaPayment from './mayaPayment/routes'
import notificationRoutes from './notifications/routes'
import adminTransaction from './admin/transaction/routes'
import adminOrders from './admin/Order/routes'
import adminUsers from './admin/users/routes'
import adminDashboard from './admin/dashboard/routes'
import cartRoutes from './cart/routes'
import adminCategory from './admin/category/routes'
import peakupTimings from './peakupTiming/routes'
import poilcies from './policy/routes'
import contactUS from './contactUs/routes'
import chat from './chat/routes'
export default [
    ...authRoutes,
    ...userRoutes,
    ...categoryRoutes,
    ...subCategoryRoutes,
    ...adminPartnerRoutes, 
    ...partnerRoutes,
    ...deliveryOptionsRoutes,
    ...customerAddressRoutes,
    ...customerOrderRoutes,
    ...adminSettings,
    ...transactions,
    ...partnerOrders,
    ...mayaPayment,
    ...notificationRoutes,
    ...adminTransaction,
    ...adminOrders,
    ...adminUsers,
    ...adminDashboard,
    ...cartRoutes,
    ...adminCategory,
    ...peakupTimings,
    ...poilcies,
    ...contactUS,
    ...chat
];
