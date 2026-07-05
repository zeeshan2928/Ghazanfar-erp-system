# ⌨️ ERP Keyboard Shortcuts Guide

## 📄 Pagination Shortcuts

Navigate through paginated content across the entire ERP system using keyboard shortcuts.

### Quick Navigation

| Shortcut | Action | Works On |
|----------|--------|----------|
| **Alt+F** or **Home** | Go to First Page | All Pages |
| **Alt+P** or **←** | Go to Previous Page | All Pages |
| **Alt+N** or **→** | Go to Next Page | All Pages |
| **Alt+L** or **End** | Go to Last Page | All Pages |

---

## 🎯 Where Shortcuts Work

### ✅ Currently Supported Screens
- **📦 Products** - Browse all 2,382 products
- **Coming Soon** - Bills, Purchase Orders, Customers

### 🔄 Planned for Future Screens
- Sales Bills page
- Purchase Orders page
- Customer Management
- Vendor Management
- Inventory Management
- Reports & Analytics

---

## 💡 Usage Tips

### Smart Detection
- Shortcuts **work** when browsing tables and lists
- Shortcuts are **disabled** when typing in search/filter boxes
- Buttons show disabled state when at boundary (first/last page)

### Visual Feedback
- All buttons have **keyboard shortcut hints** in tooltips
- Pagination bar shows **shortcuts legend** for quick reference
- Current page is clearly **highlighted and labeled**

### Best Practices
1. Use **arrows (← →)** for quick browsing
2. Use **Alt+ keys** when hands are on keyboard for text
3. Use **Home/End** keys for jumping to boundaries
4. Never need to reach for mouse while paginating!

---

## 🚀 Get Started

### Test the Shortcuts

1. **Open Products Page**
   ```
   URL: http://localhost:5173
   Login: admin@ghazanfar.com / admin@123
   Click: 📦 Products
   ```

2. **Try Navigation**
   - Press **→** to go next
   - Press **←** to go previous
   - Press **End** to jump to last page
   - Press **Home** to jump to first page

3. **Try Alt Keys**
   - Press **Alt+N** for next
   - Press **Alt+P** for previous
   - Press **Alt+F** for first
   - Press **Alt+L** for last

---

## 📊 Keyboard Shortcuts Cheat Sheet

```
╔═══════════════════════════════════════════════════════════╗
║          ERP SYSTEM PAGINATION SHORTCUTS                 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  First Page:     Alt+F  ⟷  Home                          ║
║  Previous Page:  Alt+P  ⟷  ← Left Arrow                  ║
║  Next Page:      Alt+N  ⟷  → Right Arrow                 ║
║  Last Page:      Alt+L  ⟷  End                           ║
║                                                           ║
║  💾 Works on: Products, Bills, Orders, Customers, etc.  ║
║  📱 Smart: Auto-disables in text fields                  ║
║  ⚡ Fast: No mouse required!                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🔧 Technical Details

### Implementation
- **Hook**: `usePaginationShortcuts` - Manages keyboard events
- **Component**: `Pagination` - Displays controls & legend
- **Framework**: React with TypeScript
- **Browser Support**: All modern browsers

### Key Features
- ✅ Event listener for keyboard input
- ✅ Automatic disabling on text field focus
- ✅ Boundary checking (first/last page)
- ✅ Page number calculation
- ✅ Visual feedback in UI

### How It Works
```typescript
1. User presses keyboard shortcut
2. Hook detects the key press
3. Checks if text input is active (if so, ignore)
4. Validates page boundary
5. Calls onPageChange with new page number
6. Component re-renders with new data
```

---

## 🎓 Examples

### Scenario 1: Browsing Products
```
1. Open Products page (20 items per page)
2. See page 1 of 119 pages
3. Press → to go to page 2
4. Press → again to go to page 3
5. Press End to jump to page 119
6. Press Home to go back to page 1
```

### Scenario 2: Finding Specific Item
```
1. Use search box to find items (ignore shortcuts here)
2. Get results on page 1
3. Use ← and → arrows to browse results
4. Found it? Keep this page open
5. Use Ctrl+F to search on page if needed
```

### Scenario 3: Bulk Comparison
```
1. Open Products
2. Compare items across pages
3. Use Alt+N to go to next page
4. Take note of differences
5. Use Alt+P to go back to compare
6. All without moving your hands!
```

---

## 🐛 Troubleshooting

### Shortcuts Not Working?
- ✓ Make sure focus is on the page (click the page)
- ✓ Check if you're in a text input field
- ✓ Try arrow keys if Alt+key doesn't work
- ✓ Try Home/End keys if arrow keys don't work
- ✓ Refresh the page (F5) to ensure hooks are loaded

### Button Disabled?
- ✓ You're at the first page - can't go backward
- ✓ You're at the last page - can't go forward
- ✓ This is by design to prevent confusion

### Want More Shortcuts?
- 📝 Coming soon: Custom shortcut configuration
- 🔗 Coming soon: Shortcuts for filtering & search
- 💾 Coming soon: Shortcuts saved per user

---

## 📞 Support

For issues or suggestions:
1. Check troubleshooting section above
2. Refresh the page and try again
3. Report to: zeeshan2928@gmail.com

---

**Last Updated**: 2026-07-04  
**Version**: 1.0  
**Status**: ✅ Active & Ready to Use
