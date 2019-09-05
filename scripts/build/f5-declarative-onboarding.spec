Summary: F5 Declarative Onboarding iControlLX extension
Name: f5-declarative-onboarding
Version: %{_version}
Release: %{_release}
BuildArch: noarch
Group: Development/Tools
License: Commercial
Packager: F5 Networks <support@f5.com>

AutoReqProv: no

%description
Declarative onboarding for BIG-IP

%global __os_install_post %{nil}

%define _rpmfilename %%{ARCH}/%%{NAME}-%%{VERSION}-%%{RELEASE}.%%{ARCH}.rpm
%define IAPP_INSTALL_DIR /var/config/rest/iapps/%{name}

%prep
rm -rf %{_builddir}/*
mkdir -p %{_builddir}/schema
cp %{main}/package.json %{_builddir}
cp -r %{main}/src %{_builddir}
cp -r %{main}/node_modules %{_builddir}/src/nodejs

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/schema/latest
cp %{_builddir}/package.json $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/lib $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/nodejs $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/schema/latest $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/schema
mv $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/nodejs/manifest.json $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_INSTALL_DIR}
