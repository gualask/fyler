mod descriptor;
mod encode;
mod policy;

pub use descriptor::load_source_image;
pub use encode::{prepare_pdf_image, PreparedPdfImage};
pub use policy::decide_image_embed;
