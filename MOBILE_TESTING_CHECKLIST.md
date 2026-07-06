# MOBILE TESTING CHECKLIST

**Purpose:** Verify all screens work correctly on real mobile devices  
**Timeline:** 2-3 hours  
**Devices:** iOS (iPhone 12+), Android (8.0+)

---

## ✅ PRE-TESTING SETUP

- [ ] Build production bundle: `npm run build`
- [ ] Test on localhost first: `npm run dev`
- [ ] Connect both iOS and Android devices
- [ ] Enable USB debugging (Android)
- [ ] Trust certificate (iOS)
- [ ] Disable VPN (may interfere with localhost)

---

## 🎯 SCREEN 1: WAREHOUSE STAFF (Warehouse-staff-screen.css)

### QR Scanner
- [ ] Camera permission prompt appears on first use
- [ ] QR code detection works (scan test barcode)
- [ ] Manual fallback input works
- [ ] Torch flashlight toggles on/off
- [ ] Scanner closes on successful scan
- [ ] Performance: < 2s detection time

### Gate Pass List
- [ ] List loads without errors
- [ ] Pagination works (prev/next)
- [ ] Status badges visible (colors correct)
- [ ] Tap card opens detail screen
- [ ] Customer name readable
- [ ] Badge counter shows correct number

### Picking Interface
- [ ] All items display
- [ ] Qty +/- buttons work
- [ ] Qty input accepts manual numbers
- [ ] Checkboxes toggle correctly
- [ ] Progress bar updates
- [ ] Quick action buttons visible
- [ ] "Call Customer" triggers phone dial
- [ ] "Print" opens label preview
- [ ] "Scan QR" opens camera

### Print Label
- [ ] Label preview renders
- [ ] Print dialog opens
- [ ] Multiple copy printing works
- [ ] Barcode visible and scannable

### Mobile Navigation
- [ ] Bottom nav visible and sticky
- [ ] All 4 tabs functional
- [ ] Badge visible on Picking tab
- [ ] Tab icons load
- [ ] Active tab highlighted
- [ ] Screen transitions smooth

### Offline Mode
- [ ] Disable WiFi/cellular
- [ ] Pending gate passes still display
- [ ] Tap to open existing gate pass works
- [ ] Offline banner shows
- [ ] Re-enable connection
- [ ] Auto-sync notification appears
- [ ] Gate passes refresh

---

## 🎯 SCREEN 2: INVENTORY MANAGER (Inventory-manager-screen.css)

### Dashboard
- [ ] Stats cards load
- [ ] Recent movements display
- [ ] Quick action buttons work
- [ ] Warehouse breakdown visible

### Stock Levels
- [ ] Product list loads
- [ ] Search works
- [ ] Sort buttons functional
- [ ] Filter toggle works
- [ ] Stock bars display correctly
- [ ] Low stock items highlighted

### Stock Adjustment
- [ ] Form loads
- [ ] All fields accept input
- [ ] Type buttons toggle
- [ ] Qty +/- buttons work
- [ ] Submit button functional
- [ ] Success message appears

### Movement History
- [ ] Movements load
- [ ] Date filters work
- [ ] Type filter works
- [ ] Search works
- [ ] Timeline displays
- [ ] Pagination functional

### Navigation
- [ ] Top navigation sticky
- [ ] Warehouse selector works (desktop: visible)
- [ ] User menu accessible
- [ ] Notifications badge shows
- [ ] Status bar displays

### Offline Mode
- [ ] Movement history loads from cache
- [ ] Stock levels accessible offline
- [ ] Offline banner shows
- [ ] Sync button appears
- [ ] Pending operations queue visible

---

## 📱 iOS-SPECIFIC TESTS

### iPhone Safari
- [ ] Full-screen mode works
- [ ] Notch doesn't hide content
- [ ] Safe area respected
- [ ] Bottom nav doesn't scroll away
- [ ] Keyboard doesn't hide buttons
- [ ] Camera access works
- [ ] Print sheet opens

### Performance
- [ ] App loads in < 3s
- [ ] Smooth scrolling (60fps)
- [ ] No memory leaks (check Memory in DevTools)
- [ ] Battery usage reasonable (check Activity)

### Gestures
- [ ] Pull-to-refresh works
- [ ] Swipe navigation works (if implemented)
- [ ] Tap feedback immediate
- [ ] Long-press works

### System Integration
- [ ] Phone call works from customer phone
- [ ] Notification badge shows
- [ ] Status bar respects safe area
- [ ] Orientation change smooth (portrait ↔ landscape)

---

## 🤖 ANDROID-SPECIFIC TESTS

### Chrome Browser
- [ ] Full-screen mode works
- [ ] Notch/punch-hole doesn't hide
- [ ] Safe area respected
- [ ] Bottom nav doesn't scroll away
- [ ] Keyboard handling correct
- [ ] Camera access works

### Android Features
- [ ] Back button navigates correctly
- [ ] Hardware back doesn't close app
- [ ] Navigation drawer works (desktop)
- [ ] System gestures work

### Performance
- [ ] App loads in < 3s
- [ ] Smooth scrolling (60fps)
- [ ] Battery usage monitored (DevTools)
- [ ] No ANR (Application Not Responding)

### Screen Sizes
- [ ] Phone (6.1") - Pixel 6
- [ ] Tablet (8") - if available
- [ ] Landscape orientation works

---

## 🔌 NETWORK TESTING

### Slow Network (Throttle to "Slow 4G")
- [ ] App still functional
- [ ] Loading indicators show
- [ ] Timeout handled gracefully
- [ ] Offline fallback works

### Offline
- [ ] All cached screens accessible
- [ ] Offline banner shows
- [ ] Pending operations queue visible
- [ ] Offline functions work

### Poor Signal
- [ ] Reconnection attempts work
- [ ] User notified of connection loss
- [ ] Data doesn't get corrupted

---

## 🎮 INTERACTION TESTING

### Touch Gestures
- [ ] All buttons tappable (48px+ target)
- [ ] No accidental double-taps
- [ ] Form fields easily focusable
- [ ] No lag between tap and response

### Forms
- [ ] Keyboard type matches input (email, phone, number)
- [ ] Auto-complete works
- [ ] Tab navigation works
- [ ] Submit doesn't double-submit

### Navigation
- [ ] No broken back navigation
- [ ] Deep links work (if applicable)
- [ ] Modal closes on back button
- [ ] No navigation loops

---

## 🔐 SECURITY TESTING

### Authentication
- [ ] Login persists across reload
- [ ] Logout clears credentials
- [ ] Session timeout works
- [ ] Invalid token rejected

### Data Protection
- [ ] No sensitive data in localStorage (except token)
- [ ] API calls use HTTPS
- [ ] Offline cache doesn't expose sensitive data

---

## ♿ ACCESSIBILITY TESTING

### Screen Reader (iOS VoiceOver / Android TalkBack)
- [ ] All buttons labeled
- [ ] Form labels associated
- [ ] Lists read correctly
- [ ] Icons have labels

### Keyboard Navigation
- [ ] All interactive elements reachable via Tab
- [ ] Focus indicators visible
- [ ] No keyboard traps

---

## 🐛 BUG TRACKING

For any failures found, log:

| Test | Device | OS | Issue | Severity |
|------|--------|----|----|----------|
| QR Scanner | iPhone 12 | iOS 15 | Camera won't start | Critical |
| Offline Mode | Pixel 6 | Android 12 | Data not cached | High |
| ... | ... | ... | ... | ... |

---

## ✅ FINAL SIGN-OFF

- [ ] All critical tests pass
- [ ] No data corruption observed
- [ ] Performance acceptable
- [ ] Accessibility basics covered
- [ ] Ready for production

**Tested by:** ________________  
**Date:** ________________  
**Devices:** ________________  
**Issues found:** [ ] None  [ ] Minor  [ ] Critical  

**Notes:** ____________________________________
