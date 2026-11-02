//! Keep the extension in the native dialog's file type, outside the editable default name.
pub fn parts(name:&str)->(String,Option<(&'static str,&'static str)>){
 let filename=std::path::Path::new(name).file_name().and_then(|v|v.to_str()).unwrap_or("kifu.sgf");
 let path=std::path::Path::new(filename);
 let kind=match path.extension().and_then(|v|v.to_str()).unwrap_or("").to_ascii_lowercase().as_str(){
  "sgf"=>Some(("SGF棋譜 (*.sgf)","sgf")),"json"=>Some(("解析データ (*.json)","json")),
  "png"=>Some(("PNG画像 (*.png)","png")),"jpg"|"jpeg"=>Some(("JPEG画像 (*.jpg)","jpg")),
  "gif"=>Some(("GIF画像 (*.gif)","gif")),"csv"=>Some(("CSVデータ (*.csv)","csv")),_=>None
 };
 let initial=if kind.is_some(){path.file_stem().and_then(|v|v.to_str()).unwrap_or(filename)}else{filename};
 (initial.to_string(),kind)
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn sgf_name_without_selected_extension(){assert_eq!(parts("対局.第２局.sgf"),("対局.第２局".into(),Some(("SGF棋譜 (*.sgf)","sgf"))));}
 #[test]fn upper_case_and_other_exports(){assert_eq!(parts("TEST.SGF").0,"TEST");assert_eq!(parts("盤面.png").1.unwrap().1,"png");assert_eq!(parts("結果.json").0,"結果");}
 #[test]fn unknown_extension_is_not_removed(){assert_eq!(parts("record.xyz"),("record.xyz".into(),None));}
}

/// App-owned file type labels follow the UI language; the OS owns dialog buttons.
pub fn label<'a>(japanese:&'a str,extension:&str,language:Option<&str>)->&'a str{
 if language!=Some("en"){return japanese;}
 match extension{"sgf"=>"SGF Game (*.sgf)","json"=>"Analysis Data (*.json)","png"=>"PNG Image (*.png)","jpg"=>"JPEG Image (*.jpg)","gif"=>"GIF Image (*.gif)","csv"=>"CSV Data (*.csv)",_=>japanese}
}
#[cfg(test)]mod localization_tests{use super::*;
 #[test]fn labels_follow_language(){assert_eq!(label("SGF棋譜 (*.sgf)","sgf",Some("en")),"SGF Game (*.sgf)");assert_eq!(label("SGF棋譜 (*.sgf)","sgf",None),"SGF棋譜 (*.sgf)");}
}
