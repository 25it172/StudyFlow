# StudyFlow — Smart Student Task Planner
> **Academic Mini-Project in Data Structures & Algorithms (HTML5, CSS3, Vanilla JavaScript)**

---

## 📌 1. Project Abstract & Overview

**StudyFlow** is an academic student productivity dashboard engineered to bridge foundational computer science concepts with modern interactive web development. Built strictly without external libraries, CSS frameworks, build tools, or backend servers, StudyFlow demonstrates how **Data Structures and Algorithms (DSA)** solve practical prioritization and scheduling challenges.

### Key Highlights:
- **Binary Min-Heap Priority Queue**: Computes deterministic priority scores incorporating deadlines, importance levels, and overdue penalties to guarantee that the highest-urgency academic task always resides at the root ($O(1)$ peek, $O(\log n)$ insertion and extraction).
- **Custom Hash Map with Separate Chaining**: Built from the ground up with a polynomial rolling hash function, collision resolution via linked bucket chains, and automatic dynamic resizing when the load factor $\alpha \ge 0.75$ ($O(1)$ average lookup, insert, and delete).
- **Custom Merge Sort**: Stable divide-and-conquer algorithm ($O(n \log n)$ guaranteed in all cases) used to order tasks by deadline, importance, title, and priority.
- **DSA Interactive Laboratory**: Real-time visualizer rendering both an SVG-based interactive Binary Tree and a 0-indexed Array layout, with live step-by-step logs of `heapifyUp` and `heapifyDown` sift operations.
- **Production-Quality Vanilla UI**: Clean indigo/violet design system, light/dark mode support, responsive drawer for mobile devices, accessible keyboard controls, and zero unsanitized `innerHTML` injection.

---

## 📂 2. File & Directory Structure

```
studyflow/
├── index.html              # Accessible single-page semantic application layout & modals
├── css/
│   └── style.css           # Indigo/violet theme tokens, responsive grid, light/dark modes
├── js/
│   ├── storage.js          # Safe localStorage abstraction with error resilience
│   ├── hashMap.js          # Custom Hash Map with separate chaining & dynamic resizing
│   ├── priorityQueue.js    # Binary Min-Heap with documented scoring & tie-breaking
│   ├── sorting.js          # Pure Merge Sort with recurrence proof and stable merge
│   ├── taskManager.js      # Business orchestrator syncing Hash Map, Heap, and Storage
│   ├── visualizer.js       # Live SVG Tree, Heap Array, and Hash Map bucket inspector
│   └── app.js              # Application controller, safe DOM rendering, and event handlers
└── README.md               # Project documentation, algorithmic proofs & Viva Q&A
```

---

## 🧠 3. Algorithms & Data Structures Deep-Dive

### A. Binary Min-Heap Priority Queue (`js/priorityQueue.js`)

In StudyFlow, tasks are stored in a contiguous 0-indexed array where parent and child indices satisfy:
- **Parent of index $i$**: $\lfloor(i - 1) / 2\rfloor$
- **Left child of index $i$**: $2i + 1$
- **Right child of index $i$**: $2i + 2$

#### Priority Score Formula:
In a Min-Heap, the root element holds the **minimum** key. Therefore, **smaller numerical scores represent higher urgency**:

$$\text{Priority Score} = H + (5 - I) \times 12 + \text{Penalty}$$

Where:
- $H$: Hours remaining until deadline ($H = \frac{T_{\text{due}} - T_{\text{now}}}{3600 \times 1000}$).
- $I$: Importance level, an integer in $[1, 5]$ (5 = Urgent, 1 = Low). $(5 - I) \times 12$ delays low-importance tasks by up to 48 hours in urgency score.
- $\text{Penalty}$: For overdue tasks ($H < 0$), $\text{Penalty} = H \times 2.5$ (a negative boost driving the score deeply negative, giving overdue assignments absolute priority).
- Completed tasks receive an arbitrary priority score of $+1,000,000$, ensuring they sink to the bottom.

#### Deterministic Tie-Breaking Order:
1. `priorityScore` (smaller value wins).
2. `dueDate` timestamp (earlier deadline wins).
3. `importance` level (higher importance wins).
4. `task.id` (lexicographical string comparison on unique UUID).

#### Heap Construction:
- **Floyd's Bottom-Up Algorithm**: Runs in $O(n)$ time by sifting downward starting from the last non-leaf node ($\lfloor n/2 \rfloor - 1$) down to the root ($0$), outperforming repeated insertions ($O(n \log n)$).

---

### B. Custom Hash Map with Separate Chaining (`js/hashMap.js`)

StudyFlow uses a custom hash table rather than relying on JavaScript's built-in `Map` or objects.

#### Polynomial Rolling Hash Function:
To map string keys (e.g., `task_173000...`) to an index in $[0, m - 1]$:

$$\text{hash}(s) = \left( \sum_{i=0}^{L-1} s[i] \cdot 31^{L-1-i} \right) \pmod{m}$$

Evaluated iteratively using Horner's rule to prevent 64-bit float overflow:
```javascript
hashValue = (hashValue * 31 + charCode) >>> 0;
return hashValue % capacity;
```

#### Collision Handling & Dynamic Resizing:
- **Separate Chaining**: Each slot in the bucket array stores an array/linked list of `HashEntry` pairs. Collisions are appended to the bucket chain.
- **Load Factor ($\alpha$)**: $\alpha = \frac{n}{m}$ where $n$ is total entries and $m$ is bucket capacity.
- **Resize Trigger**: When $\alpha \ge 0.75$, the capacity doubles ($m \leftarrow 2m$), and all key-value entries are re-hashed into the new bucket array, keeping average chain lengths near $O(1)$.

---

### C. Custom Merge Sort (`js/sorting.js`)

Used to sort academic tasks by deadline, importance, or title without using `Array.prototype.sort`.

#### Divide-and-Conquer Recurrence:
1. **Divide**: Split array of size $n$ into halves at midpoint ($O(1)$).
2. **Conquer**: Recursively sort both subarrays ($2 \cdot T(n/2)$).
3. **Combine**: Merge two sorted subarrays in linear time ($O(n)$).

$$T(n) = 2 \cdot T(n/2) + O(n), \quad T(1) = O(1)$$

By the **Master Theorem**:
- $a = 2$, $b = 2$, $d = 1$ (since $f(n) = O(n^1)$).
- Since $\log_b(a) = \log_2(2) = 1 = d$, **Case 2** applies:

$$T(n) = \Theta(n \log n)$$

#### Stability Guarantee:
During the `_merge` step, when comparing items with identical values, StudyFlow selects the item from the left subarray first (`comparator(...) <= 0`). This preserves the input order of elements with tied keys.

---

## ⏱️ 4. Time & Space Complexity Reference

| Data Structure / Operation | Best Case | Average Case | Worst Case | Auxiliary Space | Notes / Reason |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Min-Heap: `peek()`** | $O(1)$ | $O(1)$ | $O(1)$ | $O(1)$ | Direct root array access at index `[0]` |
| **Min-Heap: `insert()`** | $O(1)$ | $O(\log n)$ | $O(\log n)$ | $O(1)$ | Sifts up along tree height $\lceil\log_2 n\rceil$ |
| **Min-Heap: `extractMin()`**| $O(\log n)$| $O(\log n)$ | $O(\log n)$ | $O(1)$ | Root replacement and `heapifyDown` |
| **Min-Heap: `rebuild()`** | $O(n)$ | $O(n)$ | $O(n)$ | $O(1)$ | Floyd's bottom-up heapification |
| **Hash Map: `get(key)`** | $O(1)$ | $O(1)$ | $O(n)$ | $O(1)$ | $O(1)$ avg when $\alpha < 0.75$ |
| **Hash Map: `set(key)`** | $O(1)$ | $O(1)$ | $O(n)$ | $O(1)$ | Amortized $O(1)$ including periodic resizing |
| **Hash Map: `delete(key)`**| $O(1)$ | $O(1)$ | $O(n)$ | $O(1)$ | Removes node from bucket chain |
| **Hash Map: `resize()`** | $O(n + m)$ | $O(n + m)$| $O(n + m)$| $O(n + m)$ | Rehashes all entries into doubled capacity |
| **Merge Sort: Deadline** | $O(n \log n)$| $O(n \log n)$| $O(n \log n)$| $O(n)$ | Strictly stable; no worst-case degradation |

---

## 🚀 5. How to Run Locally

StudyFlow has **zero dependencies**, requires no Node.js/npm packages, and runs on any standard modern web browser.

### Option 1: Direct File Launch
1. Navigate to the project directory:
   ```
   C:\Users\Admin\.gemini\antigravity\scratch\studyflow
   ```
2. Double-click `index.html` or open it with Chrome, Edge, Firefox, or Safari.

### Option 2: Local HTTP Server (Optional)
If running inside a developer environment:
```bash
# Using Python 3
python -m http.server 8000
# Then visit: http://localhost:8000
```

---

## 🎯 6. College Viva Voce Questions & Model Answers

### Q1. Why use a Binary Min-Heap rather than maintaining a sorted array for priority tasks?
> **Answer**: In a sorted array, inserting a new task requires shifting existing elements, taking $O(n)$ time in the worst and average cases. A Binary Min-Heap provides $O(\log n)$ insertion and $O(\log n)$ extraction while maintaining $O(1)$ inspection of the most urgent task at the root. Furthermore, when many tasks update simultaneously, Floyd's bottom-up heap construction rebuilds the entire heap in $O(n)$ time rather than $O(n \log n)$ required by sorting.

### Q2. How is the priority score formulated and why does smaller mean more urgent?
> **Answer**: Standard computer science heaps are either Min-Heaps or Max-Heaps. In a Min-Heap, the root element holds the minimum value. We defined $\text{Score} = \text{Hours Remaining} + (5 - \text{Importance}) \times 12 + \text{Overdue Penalty}$. A task with fewer hours until due gets a smaller score. High importance ($5$) adds $0$ delay, while lower importance adds up to $48$ hours penalty. Overdue tasks have negative hours and receive an additional multiplier, making their scores deeply negative so they float to the root.

### Q3. How does StudyFlow achieve deterministic tie-breaking?
> **Answer**: If two tasks yield identical priority scores, the comparator evaluates three deterministic fallback criteria: (1) earlier deadline timestamp, (2) higher importance rating, and (3) unique task ID string comparison (`localeCompare`). This prevents arbitrary reordering or jitter in the priority queue.

### Q4. How does the custom Hash Map resolve collisions, and why is separate chaining preferred?
> **Answer**: Separate chaining allocates a fixed bucket array where each slot points to a list of entries mapping to that bucket index. When collisions occur, the new entry is appended to the chain. Separate chaining handles deletions cleanly without requiring tombstone flags (unlike linear probing) and degrades gracefully even under high load factors without primary clustering.

### Q5. Why is the multiplier 31 used in the polynomial rolling hash function?
> **Answer**: 31 is an odd prime number. Prime multipliers reduce arithmetic resonance with powers of two (the underlying binary representation of characters). Additionally, modern compilers optimize multiplication by 31 into an ultra-fast bit shift and subtraction: $31 \times x = (x \ll 5) - x$.

### Q6. When and why does the Hash Map resize dynamically?
> **Answer**: The load factor is defined as $\alpha = n / m$. When $\alpha \ge 0.75$, the probability of bucket collisions increases, lengthening chains and degrading search time toward $O(n)$. Dynamic resizing doubles the capacity ($m \leftarrow 2m$) and rehashes all elements, restoring expected $O(1)$ performance.

### Q7. Why is Merge Sort preferred over QuickSort for deadline ordering?
> **Answer**: Merge Sort is strictly **stable**, meaning tasks with the same deadline preserve their secondary ordering (e.g., creation order or importance). In contrast, standard QuickSort is unstable and can degrade to $O(n^2)$ time if the pivot selection encounters already sorted or identical deadline values. Merge Sort guarantees $O(n \log n)$ in all cases.

### Q8. Prove the $O(n)$ time complexity of Floyd's Bottom-Up Heap Construction.
> **Answer**: An array of size $n$ has at most $\lceil n / 2^{h+1} \rceil$ nodes at height $h$. The maximum swaps a node at height $h$ can perform during `heapifyDown` is $h$. The total work is:
> $$W(n) = \sum_{h=0}^{\lfloor\log_2 n\rfloor} \left\lceil \frac{n}{2^{h+1}} \right\rceil O(h) = O\left(n \sum_{h=0}^{\infty} \frac{h}{2^h}\right)$$
> The infinite summation $\sum_{h=0}^{\infty} h / 2^h$ converges to $2$. Therefore, $W(n) = O(2n) = O(n)$.

### Q9. How are timezone bugs prevented in task deadline calculations?
> **Answer**: Naive implementations use UTC ISO string slicing (`toISOString()`), which shifts late-night deadlines into the next day depending on the user's timezone offset. StudyFlow consistently extracts local calendar components (`getFullYear()`, `getMonth()`, `getDate()`, `getHours()`, `getMinutes()`) and compares deadlines using raw epoch milliseconds (`getTime()`).

### Q10. How does the architecture prevent Cross-Site Scripting (XSS)?
> **Answer**: The application strictly avoids `innerHTML` when handling user-provided strings (task titles, descriptions, and subject tags). All DOM updates are executed via `textContent`, `document.createElement`, and text nodes, ensuring that malicious inputs (e.g. `<img src=x onerror=alert(1)>`) are treated solely as literal strings.

---

## 🛡️ 7. Browser Compatibility & Security

- **Supported Browsers**: Chrome 90+, Firefox 88+, Microsoft Edge 90+, Safari 14+.
- **Security Features**:
  - Contextual escaping through safe DOM APIs.
  - Safe LocalStorage wrapper with fallback memory store for restricted environments.
  - No external CDNs or third-party tracking scripts.
