use lopdf::Object;

#[derive(Debug, Clone, Copy)]
pub(super) struct AffineTransform {
    a: f32,
    b: f32,
    c: f32,
    d: f32,
    e: f32,
    f: f32,
}

impl Default for AffineTransform {
    fn default() -> Self {
        Self::identity()
    }
}

impl AffineTransform {
    pub(super) fn identity() -> Self {
        Self {
            a: 1.0,
            b: 0.0,
            c: 0.0,
            d: 1.0,
            e: 0.0,
            f: 0.0,
        }
    }

    pub(super) fn from_operands(operands: &[Object]) -> Option<Self> {
        if operands.len() != 6 {
            return None;
        }

        Some(Self {
            a: number(&operands[0])?,
            b: number(&operands[1])?,
            c: number(&operands[2])?,
            d: number(&operands[3])?,
            e: number(&operands[4])?,
            f: number(&operands[5])?,
        })
    }

    pub(super) fn from_array(obj: &Object) -> Option<Self> {
        let items = obj.as_array().ok()?;
        Self::from_operands(items)
    }

    pub(super) fn concat(self, next: Self) -> Self {
        Self {
            a: self.a * next.a + self.b * next.c,
            b: self.a * next.b + self.b * next.d,
            c: self.c * next.a + self.d * next.c,
            d: self.c * next.b + self.d * next.d,
            e: self.e * next.a + self.f * next.c + next.e,
            f: self.e * next.b + self.f * next.d + next.f,
        }
    }

    pub(super) fn axis_lengths(self) -> (f32, f32) {
        let width = (self.a.mul_add(self.a, self.b * self.b)).sqrt();
        let height = (self.c.mul_add(self.c, self.d * self.d)).sqrt();
        (width.abs(), height.abs())
    }
}

fn number(obj: &Object) -> Option<f32> {
    obj.as_f32().ok().or_else(|| obj.as_float().ok())
}
