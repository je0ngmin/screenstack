# Cupertino Swipe Back

`CupertinoPageRoute` starts tracking a pointer when it is pressed within the
left edge of the route.

## Behavior

1. Press within `edgeWidth` pixels of the route's own left edge.
2. Drag right to move the active page with the pointer.
3. Release after crossing the distance threshold or with sufficient velocity
   to complete the pop.
4. Otherwise, the route returns to its original position.

The edge is measured relative to the route element, not the browser viewport.
The gesture therefore continues to work inside centered or constrained
containers such as:

```css
.device {
  margin: 0 auto;
  max-width: 560px;
}
```

## Configuration

```tsx
<CupertinoPageRoute edgeWidth={32} swipeBackEnabled>
  <DetailsPage />
</CupertinoPageRoute>
```

| Prop | Default | Description |
| --- | --- | --- |
| `edgeWidth` | `24` | Width of the interactive area at the route's left edge. |
| `swipeBackEnabled` | `true` | Enables or disables interactive pop. |

Swipe back is disabled automatically for the root screen because there is no
previous screen to reveal.

While dragging, the route follows the pointer linearly. After release, it
settles to the completed or cancelled position. The covered route moves left
for a subtle parallax effect. Transparent interaction guards prevent the
previous route and nested scroll areas from receiving input during transitions
and interactive swipes.
