package af.daneshjuyan.app;

import android.app.*;
import android.os.*;
import android.content.*;
import android.graphics.Bitmap;
import android.net.Uri;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import com.googlecode.tesseract.android.TessBaseAPI;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.rendering.PDFRenderer;
import com.tom_roush.pdfbox.text.PDFTextStripper;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.*;
import org.json.*;
import java.net.*;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;

public class MainActivity extends Activity {
    private static final int PICK=101, SAVE=102;
    private LinearLayout root;
    private TextView status;
    private EditText editor;
    private String outputFormat="txt";
    private Uri selected;
    private WebView web;
    private boolean online=false;
    private LinearLayout adList;
    private static final String ADS_URL="https://daneshjuyan.pages.dev/api/app-ads";

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        PDFBoxResourceLoader.init(getApplicationContext());
        home();
    }
    private TextView title(String s,int size) {
        TextView t=new TextView(this); t.setText(s);t.setTextSize(size);
        t.setPadding(20,18,20,18);return t;
    }
    private Button button(String text,Runnable run){
        Button b=new Button(this);b.setText(text);b.setOnClickListener(v->run.run());return b;
    }
    private void base(){
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(14,16,14,12);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        setContentView(root);
    }
    private void home(){
        online=false;base();
        root.addView(title("دانشجویان",27));
        root.addView(title("سایت و امکانات آموزشی (نیازمند اینترنت)",16));
        root.addView(button("🌐 ورود به سایت دانشجویان",this::showSite));
        root.addView(title("ابزار مستقل بدون اینترنت",16));
        root.addView(button("📴 تبدیل PDF فارسی به Word و TXT (آفلاین)",this::offline));
        ScrollView adScroll=new ScrollView(this);
        adList=new LinearLayout(this);adList.setOrientation(LinearLayout.VERTICAL);
        adScroll.addView(adList);
        root.addView(adScroll,new LinearLayout.LayoutParams(-1,0,1));
        renderAds(getPreferences(0).getString("cached_ads","[]"));
        refreshAds();
    }
    private void refreshAds(){
        new Thread(()->{
            HttpURLConnection connection=null;
            try{
                connection=(HttpURLConnection)new URL(ADS_URL).openConnection();
                connection.setConnectTimeout(8000);connection.setReadTimeout(8000);
                connection.setRequestProperty("Accept","application/json");
                int responseCode=connection.getResponseCode();
                if(responseCode!=200){
                    reportAdsError("سرور تبلیغات اپلیکیشن پاسخ " + responseCode + " داد. انتشار API و جدول app_ads را بررسی کنید.");
                    return;
                }
                ByteArrayOutputStream buf=new ByteArrayOutputStream();
                try(InputStream in=connection.getInputStream()){
                    byte[] bytes=new byte[8192];int n;
                    while((n=in.read(bytes))!=-1)buf.write(bytes,0,n);
                }
                JSONObject response=new JSONObject(buf.toString("UTF-8"));
                JSONArray ads=response.getJSONArray("ads");
                String raw=ads.toString();
                getPreferences(0).edit().putString("cached_ads",raw).apply();
                runOnUiThread(()->{if(adList!=null)renderAds(raw);});
            }catch(Exception error){
                reportAdsError("دریافت تبلیغات اپلیکیشن ناموفق بود: " + error.getClass().getSimpleName());
            }finally{if(connection!=null)connection.disconnect();}
        }).start();
    }
    private void reportAdsError(String message){
        runOnUiThread(()->Toast.makeText(getApplicationContext(),message,Toast.LENGTH_LONG).show());
    }
    private GradientDrawable cardBackground(){
        GradientDrawable bg=new GradientDrawable();
        bg.setColor(Color.WHITE);bg.setCornerRadius(24);
        bg.setStroke(1,Color.rgb(221,232,231));return bg;
    }
    private void renderAds(String raw){
        if(adList==null)return;
        adList.removeAllViews();
        try{
            JSONArray ads=new JSONArray(raw);
            if(ads.length()==0)return;
            for(int i=0;i<ads.length();i++){
                JSONObject ad=ads.getJSONObject(i);
                String name=ad.optString("title","تبلیغ"),description=ad.optString("description","");
                String target=ad.optString("targetUrl",""),picture=ad.optString("imageUrl","");
                LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);
                card.setPadding(22,18,22,18);card.setBackground(cardBackground());
                card.setElevation(4);
                LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);
                lp.setMargins(5,8,5,14);adList.addView(card,lp);
                TextView badge=title("تبلیغ",12);badge.setTextColor(Color.rgb(9,120,107));card.addView(badge);
                TextView heading=title(name,19);heading.setTextColor(Color.rgb(23,51,58));card.addView(heading);
                if(!description.isEmpty())card.addView(title(description,14));
                if(picture.startsWith("https://")){
                    ImageView image=new ImageView(this);image.setAdjustViewBounds(true);
                    image.setScaleType(ImageView.ScaleType.FIT_CENTER);
                    card.addView(image,new LinearLayout.LayoutParams(-1,-2));
                    loadAdImage(picture,image);
                }
                if(target.startsWith("https://")||target.startsWith("http://")){
                    card.addView(button("مشاهده تبلیغ ↗",()->{
                        try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(target)));}catch(Exception ignored){}
                    }));
                }
            }
        }catch(Exception e){reportAdsError("خواندن تبلیغات ذخیره‌شده ممکن نیست.");}
    }
    private void loadAdImage(String url,ImageView view){
        File saved=new File(getFilesDir(),"ad-image-"+Integer.toHexString(url.hashCode())+".png");
        if(saved.exists()){
            Bitmap cached=BitmapFactory.decodeFile(saved.getAbsolutePath());
            if(cached!=null)view.setImageBitmap(cached);
        }
        new Thread(()->{
            try{
                HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
                c.setConnectTimeout(5000);c.setReadTimeout(7000);
                try(InputStream in=c.getInputStream()){
                    File imageFile=new File(getFilesDir(),"ad-image-"+Integer.toHexString(url.hashCode())+".png");
                    try(OutputStream out=new FileOutputStream(imageFile)){
                        byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);
                    }
                    Bitmap bmp=BitmapFactory.decodeFile(imageFile.getAbsolutePath());
                    if(bmp!=null)runOnUiThread(()->view.setImageBitmap(bmp));
                }finally{c.disconnect();}
            }catch(Exception ignored){}
        }).start();
    }
    private void showSite(){
        online=true;base();
        root.addView(button("بازگشت به خانه",this::home));
        web=new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        web.loadUrl("https://daneshjuyan.pages.dev/");
    }
    private void offline(){
        online=false;base();
        root.addView(button("بازگشت به خانه",this::home));
        root.addView(title("تبدیل PDF آفلاین — فایل‌ها از گوشی خارج نمی‌شوند",18));
        root.addView(button("انتخاب فایل PDF",()->{
            Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.setType("application/pdf");i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(i,PICK);
        }));
        status=title("ابتدا یک PDF انتخاب کنید.",14);root.addView(status);
        editor=new EditText(this);editor.setGravity(Gravity.TOP|Gravity.RIGHT);
        editor.setTextDirection(View.TEXT_DIRECTION_RTL);editor.setTextSize(15);
        editor.setHint("متن استخراج‌شده اینجا نمایش داده می‌شود و قابل ویرایش است.");
        root.addView(editor,new LinearLayout.LayoutParams(-1,0,1));
        root.addView(button("ذخیره TXT",()->save("txt")));
        root.addView(button("ذخیره Word (DOCX)",()->save("docx")));
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        if(request==PICK){
            selected=data.getData();
            status.setText("در حال استخراج متن و OCR فارسی... لطفاً صبر کنید.");
            new Thread(()->convert(selected)).start();
        }else if(request==SAVE){
            try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
                String text=editor.getText().toString();
                if(outputFormat.equals("txt"))out.write(text.getBytes(StandardCharsets.UTF_8));
                else writeDocx(out,text);
                Toast.makeText(this,"فایل ذخیره شد",Toast.LENGTH_LONG).show();
            }catch(Exception ex){Toast.makeText(this,"خطا: "+ex.getMessage(),Toast.LENGTH_LONG).show();}
        }
    }
    private void convert(Uri uri){
        String result="";
        try{
            File pdf=new File(getCacheDir(),"input.pdf");
            try(InputStream in=getContentResolver().openInputStream(uri);
                OutputStream out=new FileOutputStream(pdf)){
                byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);
            }
            try(PDDocument doc=PDDocument.load(pdf)){
                PDFRenderer renderer=new PDFRenderer(doc);
                PDFTextStripper stripper=new PDFTextStripper();
                TessBaseAPI tess=new TessBaseAPI();
                File dir=new File(getFilesDir(),"ocr");File trained=new File(dir,"tessdata/fas.traineddata");
                trained.getParentFile().mkdirs();
                if(!trained.exists()){
                    try(InputStream in=getAssets().open("tessdata/fas.traineddata");
                        OutputStream out=new FileOutputStream(trained)){
                        byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);
                    }
                }
                if(!tess.init(dir.getAbsolutePath(),"fas"))throw new IOException("مدل OCR فارسی بارگذاری نشد");
                StringBuilder sb=new StringBuilder();
                try{
                    for(int p=0;p<doc.getNumberOfPages();p++){
                        stripper.setStartPage(p+1);stripper.setEndPage(p+1);
                        String extracted=stripper.getText(doc).trim();
                        // OCR for scanned pages and PDFs with corrupted/empty text
                        boolean useOcr=extracted.length()<35 || extracted.indexOf('\uFFFD')>=0;
                        String page=extracted;
                        if(useOcr){
                            Bitmap bitmap=renderer.renderImageWithDPI(p,180);
                            tess.setImage(bitmap);page=tess.getUTF8Text();
                            bitmap.recycle();tess.clear();
                        }
                        sb.append(page==null?"":page).append("\n\n");
                        int current=p+1,total=doc.getNumberOfPages();
                        runOnUiThread(()->status.setText("صفحه "+current+" از "+total));
                    }
                }finally{tess.end();}
                result=sb.toString();
            }
            String text=result;
            runOnUiThread(()->{editor.setText(text);status.setText("تبدیل کامل شد. متن را بررسی و ذخیره کنید.");});
        }catch(Exception e){runOnUiThread(()->status.setText("خطا: "+e.getMessage()));}
    }
    private void save(String format){
        if(editor==null||editor.getText().length()==0){Toast.makeText(this,"ابتدا PDF را تبدیل کنید",Toast.LENGTH_SHORT).show();return;}
        outputFormat=format;
        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.setType(format.equals("txt")?"text/plain":"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.putExtra(Intent.EXTRA_TITLE,"daneshjuyan-converted."+format);
        startActivityForResult(i,SAVE);
    }
    private static String escape(String s){
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
    }
    private static void entry(ZipOutputStream z,String name,String content)throws IOException{
        z.putNextEntry(new ZipEntry(name));z.write(content.getBytes(StandardCharsets.UTF_8));z.closeEntry();
    }
    private static void writeDocx(OutputStream out,String content)throws IOException{
        try(ZipOutputStream z=new ZipOutputStream(out)){
            entry(z,"[Content_Types].xml","<?xml version=\"1.0\" encoding=\"UTF-8\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>");
            entry(z,"_rels/.rels","<?xml version=\"1.0\" encoding=\"UTF-8\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>");
            StringBuilder xml=new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>");
            for(String line:content.split("\\r?\\n",-1))
                xml.append("<w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space=\"preserve\">").append(escape(line)).append("</w:t></w:r></w:p>");
            xml.append("<w:sectPr/></w:body></w:document>");
            entry(z,"word/document.xml",xml.toString());
        }
    }
    @Override public void onBackPressed(){
        if(online&&web!=null&&web.canGoBack())web.goBack();else home();
    }
}
