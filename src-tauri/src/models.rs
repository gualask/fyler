#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub path: String,
    pub name: String,
    #[serde(rename = "pageCount")]
    pub page_count: u32,
    #[serde(rename = "pageSpec")]
    pub page_spec: String,
    pub kind: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeInput {
    pub path: String,
    #[serde(rename = "pageSpec")]
    pub page_spec: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeRequest {
    pub inputs: Vec<MergeInput>,
    #[serde(rename = "outputPath")]
    pub output_path: String,
}
