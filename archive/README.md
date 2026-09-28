# 原始压缩包

`website.zip.part01` 和 `website.zip.part02` 是原始 `website.zip` 的连续二进制分卷。将本目录完整下载到本地后，在仓库根目录运行：

```bash
python archive/reassemble.py
```

脚本会生成 `website.zip` 并验证其 SHA-256：

`b108413c88b184508add432711d13534c176a73999b63937121e16430a7b6518`

展项的可编辑文件已放在仓库的 `exhibits/` 目录，浏览和修改时无需重组压缩包。
