      updatePolygonData: (id, value, color) => {
        const polygons = get().polygons;
        if (!polygons[id]) return;

        // check if anything actually changed to avoid re-writing identical state (prevents loops)
        const existing = polygons[id];
        const valueChanged = existing.currentValue !== value;
        const colorChanged = existing.displayColor !== color;

        if (!valueChanged && !colorChanged) {
          return;
        }

        set((state) => ({
          polygons: {
            ...state.polygons,
            [id]: {
              ...state.polygons[id],
              currentValue: value,
              displayColor: color,
            },
          },
        }));
      },
